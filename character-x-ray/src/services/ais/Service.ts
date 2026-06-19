import { Flow } from "flow-sdk";
import { DevelopmentUpdate, CharacterState, Feedback, CharacterSummaries } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to parse JSON from AI output, stripping markdown fences and
 * trying to extract a JSON object even if surrounded by prose.
 */
function safeJsonParse<T>(raw: string): T {
    // Strip markdown code fences
    let cleaned = raw;
    while (cleaned.includes('```json')) cleaned = cleaned.split('```json').join('');
    while (cleaned.includes('```')) cleaned = cleaned.split('```').join('');
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        // Attempt to find the first { ... } or [ ... ] block
        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        const arrStart = cleaned.indexOf('[');
        const arrEnd = cleaned.lastIndexOf(']');
        const objMatch = objStart !== -1 && objEnd > objStart ? cleaned.slice(objStart, objEnd + 1) : null;
        const arrMatch = arrStart !== -1 && arrEnd > arrStart ? cleaned.slice(arrStart, arrEnd + 1) : null;
        const candidate = objMatch || arrMatch;
        if (candidate) {
            return JSON.parse(candidate);
        }
        throw new Error("Could not extract valid JSON from AI response.");
    }
}

/**
 * Simple retry wrapper — one retry with a short delay.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1500): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        console.warn(`⚠️ Retrying after error:`, err);
        await new Promise(r => setTimeout(r, delayMs));
        return withRetry(fn, retries - 1, delayMs * 2);
    }
}

/**
 * Build an images array for Flow.generate.text() from a CharacterImage.
 */
function buildFlowImages(img: { base64: string; mimeType: string }): { base64: string; mimeType: string }[] {
    const base64 = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
    return [{ base64, mimeType: img.mimeType }];
}

// ---------------------------------------------------------------------------
// System Instruction
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are a character design executive. Direct, opinionated, terse.\n\nCRITICAL: Read the brief carefully. The subject may be human, animal, creature, robot, or anything else. Adapt your vocabulary to match. If the subject is non-human, do NOT critique wardrobe as clothing — critique their physical design (fur, scales, markings, build, anatomy, texture, coloring).\n\nWith an image:\n1. Audit the subject\x27s visual design: physical features, textures, coloring, and overall aesthetic.\n2. Flag contradictions between the brief and what\x27s shown.\n3. Focus on character design, not cinematography.\n\nWithout an image:\n1. Propose specific, unexpected visual concepts from the brief.\n2. Suggest physical design details and color palettes that avoid cliché.\n3. Focus on "why" — what the look reveals about the character.\n\nFeedback rules:\n- 3-4 items. Categories: wardrobe, style, color, lore, narrative.\n- Wardrobe: For humans — garments, fits, textures. For non-humans — physical features, fur/scale patterns, build, anatomy, distinguishing marks.\n- Style: overall visual aesthetic — mood, artistic direction, rendering style, environment design. NOT camera/lens/DOP.\n- Color: palette critique — hues, contrast, saturation. Push for story-driven choices.\n- Lore/Narrative: psychological or behavioral subtext of the appearance.\n- Keep insights to 1 sentence. Suggestions to 10 words max each.\n- No adjective stacking. Simple, unpretentious language.\n- Be nuanced, avoid stereotypes.\n\nReturn ONLY valid JSON:\n{\n  "feedback": [\n    {\n      "id": "unique-string",\n      "category": "wardrobe",\n      "insight": "One terse observation about physical design.",\n      "suggestions": [\n        { "text": "Short directive", "reasoning": "Brief reason." },\n        { "text": "Another directive", "reasoning": "Brief reason." }\n      ]\n    }\n  ]\n}`;

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export async function getCharacterUpdate(state: CharacterState): Promise<DevelopmentUpdate> {
    return withRetry(async () => {
        const currentImage = state.imageHistory[state.currentImageIndex];
        const prompt = currentImage
            ? `Current Brief: ${state.initialBackstory}\n\nTASK: Perform a visual audit. Look at the attached image. Identify garments or styles that feel "out of character" for their stated class, role, or backstory. Provide specific, grounded wardrobe/style critiques based on the brief.`
            : `Current Brief: ${state.initialBackstory}\n\nTASK: We do not have an image yet. Brainstorm and explore the character\x27s visual identity based purely on the text. Suggest highly specific, unexpected wardrobe and styling concepts that establish their class, mindset, and background. Provide exploratory but deeply opinionated style suggestions to help the user visualize this character.`;

        const images = currentImage ? buildFlowImages(currentImage) : undefined;

        const { text } = await Flow.generate.text(prompt, {
            systemInstruction: SYSTEM_INSTRUCTION,
            images,
            thinkingLevel: 'low',
        });
        const parsed = safeJsonParse<DevelopmentUpdate>(text);

        // Ensure every feedback item has a suggestions array
        if (parsed.feedback) {
            parsed.feedback = parsed.feedback.map((f: Feedback) => ({
                ...f,
                suggestions: f.suggestions || [],
            }));
        }

        return parsed;
    });
}

export async function regenerateSingleFeedback(
    state: CharacterState,
    otherFeedback: Feedback[]
): Promise<Feedback> {
    return withRetry(async () => {
        const existingTopics = otherFeedback.map((f) => `${f.category}: ${f.insight}`).join(String.fromCharCode(10));
        const currentImage = state.imageHistory[state.currentImageIndex];
        const prompt = `Brief: ${state.initialBackstory}\n\nALREADY COVERED (do NOT repeat these):\n${existingTopics || "None"}\n\nGenerate exactly 1 NEW feedback item about this character. Pick a category NOT already covered: wardrobe, style, color, lore, or narrative.\nBe specific, opinionated, and terse. Include 2 actionable suggestions.\n\nReturn ONLY this JSON:\n{"category": "wardrobe|style|color|lore|narrative", "insight": "one terse observation", "suggestions": [{"text": "do X", "reasoning": "because Y"}, {"text": "do Z", "reasoning": "because W"}]}`;

        const images = currentImage ? buildFlowImages(currentImage) : undefined;

        const { text } = await Flow.generate.text(prompt, {
            systemInstruction: SYSTEM_INSTRUCTION,
            images,
            thinkingLevel: 'low',
        });
        let parsed = safeJsonParse<any>(text);

        // Handle AI wrapping in a feedback array
        if (parsed.feedback && Array.isArray(parsed.feedback)) {
            parsed = parsed.feedback[0] || parsed;
        }
        if (Array.isArray(parsed)) {
            parsed = parsed[0] || {};
        }

        return {
            id: parsed.id || `q-${Date.now()}`,
            category: parsed.category || 'style',
            insight: parsed.insight || '',
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((s: any) => ({
                text: s.text || '',
                reasoning: s.reasoning || '',
            })) : [],
        };
    });
}

export async function updateCharacterBrief(
    currentBrief: string,
    acceptedFeedback: { insight: string; answer: string }[]
): Promise<{ updatedBrief: string; highlightSegments: string[] }> {
    return withRetry(async () => {
        const feedbackSummary = acceptedFeedback
            .map((f) => `Insight: "${f.insight}" → Chosen direction: "${f.answer}"`)
            .join(String.fromCharCode(10));

        const prompt = `You are a character development writer. Your job is to evolve a character brief based on creative decisions that were just made.\n\nCURRENT BRIEF:\n"""\n${currentBrief}\n"""\n\nDECISIONS MADE:\n${feedbackSummary}\n\nYOUR TASK:\n- Integrate the decisions into the brief as natural, flowing prose.\n- If a decision contradicts something in the brief, replace the old detail seamlessly.\n- Write in a vivid but concise style — like a film treatment or character bible entry. Favor specific nouns and adjectives over generic description.\n- Do NOT pad with filler. Every sentence should carry visual or narrative weight.\n- If the current brief is empty or very short, write a complete 2-4 sentence character description incorporating all the decisions.\n- The "highlightSegments" must contain the EXACT new or changed substrings as they appear in your updatedBrief.\n\nReturn ONLY valid JSON:\n{ "updatedBrief": "the full updated brief text", "highlightSegments": ["exact new phrase 1", "exact changed detail 2"] }`;

        const { text } = await Flow.generate.text(prompt, { thinkingLevel: 'low' });
        const parsed = safeJsonParse<{ updatedBrief?: string; highlightSegments?: string[] }>(text);

        return {
            updatedBrief: parsed.updatedBrief || currentBrief,
            highlightSegments: parsed.highlightSegments || [],
        };
    });
}

export async function craftImagePrompt(
    currentBrief: string,
    recentChanges: string[],
    enrichment?: { wardrobe: string; personality: string }
): Promise<string> {
    const hasChanges = recentChanges.length > 0;

    if (hasChanges) {
        // SURGICAL: only describe the exact changes, nothing else
        const prompt = `You are writing a SURGICAL image editing prompt. The reference image is already attached.\n\nTHE ONLY CHANGES TO MAKE:\n${recentChanges.map((c) => `- ${c}`).join(String.fromCharCode(10))}\n\nSTRICT RULES:\n- Describe ONLY the changes listed above. Nothing else.\n- Do NOT add, invent, or modify anything beyond the listed changes.\n- Do NOT change clothing, hair, pose, lighting, or any other attribute unless it is explicitly listed above.\n- Keep the EXACT SAME framing, camera distance, composition, and head position.\n- 1 sentence max. Be extremely precise.\n- The original image is already included — do not describe what it currently looks like, only what should change.\n\nReturn ONLY the prompt text.`;

        const { text } = await Flow.generate.text(prompt, { thinkingLevel: 'low' });
        return text.trim();
    }

    // FRESH GENERATION — use enriched context if available
    const enrichmentBlock = enrichment
        ? `${String.fromCharCode(10)}PRE-REASONED WARDROBE DETAILS:${String.fromCharCode(10)}"""${String.fromCharCode(10)}${enrichment.wardrobe}${String.fromCharCode(10)}"""${String.fromCharCode(10)}${String.fromCharCode(10)}PRE-REASONED PSYCHOLOGY:${String.fromCharCode(10)}"""${String.fromCharCode(10)}${enrichment.personality}${String.fromCharCode(10)}"""${String.fromCharCode(10)}`
        : '';

    const prompt = `You are writing an image generation prompt for a character portrait.\n\nCHARACTER BRIEF:\n"""\n${currentBrief}\n"""\n${enrichmentBlock}\nRULES:\n- Write a single, dense image generation prompt. No JSON.\n- Focus ONLY on PHYSICAL, VISIBLE attributes: clothing, hair, skin, expression, posture, color palette.\n- ${enrichment ? 'Use the pre-reasoned wardrobe and psychology details to inform every visual choice. Make the image reflect the psychology through visual cues.' : 'Do NOT invent specific props, settings, or environments unless the brief explicitly mentions them.'}\n- Skip abstract concepts — translate everything into concrete visual details.\n- 2-3 sentences max. Be precise and vivid.\n\nReturn ONLY the prompt text.`;

    const { text } = await Flow.generate.text(prompt, { thinkingLevel: 'low' });
    return text.trim();
}

export async function reVisualizeCharacter(
    state: CharacterState,
    enrichment?: { wardrobe: string; personality: string }
): Promise<{ dataUrl: string, mediaId: string }> {
    const recentChanges = state.highlightSegments || [];
    const currentImage = state.imageHistory[state.currentImageIndex];
    const hasChanges = recentChanges.length > 0;

    let prompt: string;

    if (hasChanges) {
        prompt = await craftImagePrompt(state.initialBackstory, recentChanges);
    } else if (currentImage) {
        prompt = `Regenerate this character portrait. Keep everything the same. Brief context: ${state.initialBackstory}`;
    } else {
        prompt = await craftImagePrompt(state.initialBackstory, [], enrichment);
    }

    // Use existing mediaId directly instead of redundant re-uploading
    const referenceImageMediaIds = currentImage?.mediaId ? [currentImage.mediaId] : undefined;

    try {
        const result = await Flow.generate.image({
            prompt,
            referenceImageMediaIds,
            modelDisplayName: 'Nano Banana 2'
        });
        return {
            dataUrl: `data:${result.mimeType};base64,${result.base64}`,
            mediaId: result.mediaId
        };
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function generateCharacterSummaries(
    state: CharacterState
): Promise<CharacterSummaries> {
    return withRetry(async () => {
        const currentImage = state.imageHistory[state.currentImageIndex];

        const prompt = `Produce two brief summaries of this character.\n\nBRIEF: "${state.initialBackstory}"\n\nRULES:\n- Adapt to the subject — human, animal, creature, robot, etc.\n- "wardrobe": ${currentImage ? 'Describe what the subject looks like. Humans: garments, colors, textures. Non-humans: physical features, markings, build, coloring.' : 'What would this subject look like? For humans, describe garments, colors, textures. For non-humans, describe physical features, markings, build, coloring.'}\n- "personality": Infer psychology and inner nature. For non-humans: temperament and instincts.\n- Write as a natural, unpretentious paragraph.\n- No filler, no preamble, no adjective stacking. \n\nReturn ONLY: { "wardrobe": "...", "personality": "..." }`;

        const images = currentImage ? buildFlowImages(currentImage) : undefined;

        const { text } = await Flow.generate.text(prompt, { images, thinkingLevel: 'low' });
        const parsed = safeJsonParse<CharacterSummaries>(text);

        return {
            wardrobe: parsed.wardrobe || '',
            personality: parsed.personality || '',
        };
    });
}

/**
 * Generate an image from a raw prompt string + optional reference image.
 * Used when the user reviews and confirms the crafted prompt.
 */
export async function generateImageFromPrompt(
    prompt: string,
    referenceImageMediaId?: string
): Promise<{ dataUrl: string, mediaId: string }> {
    const referenceImageMediaIds = referenceImageMediaId ? [referenceImageMediaId] : undefined;
    const result = await Flow.generate.image({
        prompt,
        referenceImageMediaIds,
        modelDisplayName: 'Nano Banana 2'
    });
    return {
        dataUrl: `data:${result.mimeType};base64,${result.base64}`,
        mediaId: result.mediaId
    };
}