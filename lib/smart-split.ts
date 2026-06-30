import { localChat } from "@/lib/local-ai";
import { type InitProgressReport } from "@mlc-ai/web-llm";

const SPLIT_SYSTEM = `You are an expert prompt analyzer for a video generation platform.
Given the following raw text prompt, identify the 3 to 8 most important variable words or short descriptive phrases (e.g., subjects, art styles, lighting, camera angles, colors, environments, actions).
Wrap each of these identified words in the original text with this exact syntax: {{variable_name::original_word}}

Rules:
1. ONLY wrap the words you want to make variable. Keep the rest of the text EXACTLY as is.
2. The variable_name must be lowercase, underscore-separated, and descriptive (e.g., subject, lighting_style, camera_angle, time_of_day, color_palette).
3. Do NOT change any words, do not translate, do not summarize.
4. Return ONLY the fully annotated text. No intro, no explanation, no markdown blocks.

Example Input:
"A beautiful woman walking in a rainy cyberpunk city at night, neon lighting, highly detailed."
Example Output:
"A beautiful {{subject::woman}} walking in a rainy {{environment::cyberpunk city}} at {{time_of_day::night}}, {{lighting::neon lighting}}, {{quality::highly detailed}}."`;

export async function runSmartSplit(
  rawText: string, 
  onProgress?: (progress: InitProgressReport) => void
): Promise<{ cleanTemplate: string; extractedVariables: Map<string, string> }> {
  
  if (!rawText || !rawText.trim()) throw new Error("Empty text");
  
  const out = await localChat(
    rawText,
    SPLIT_SYSTEM,
    onProgress
  );

  const aiContent = out.trim();
  const varMatches = [...aiContent.matchAll(/\{\{(\w+)(?:::([^}]+))?\}\}/g)];

  // We can technically have 0 matches if the AI didn't find any variables, but we still return the clean text.
  const varMap = new Map<string, string>();
  varMatches.forEach(m => {
    const [, key, originalWord] = m;
    if (!varMap.has(key)) {
      const cleaned = (originalWord?.trim() || key).replace(/^[\[a?O{]+|[\]a??}]+$/g, '');
      varMap.set(key, cleaned);
    }
  });

  const cleanTemplate = aiContent.replace(/\{\{(\w+)(?:::[^}]+)?\}\}/g, '{{$1}}').trim();

  return { cleanTemplate, extractedVariables: varMap };
}
