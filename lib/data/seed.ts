import type { PromptItem, EnvironmentItem, Ingredient, Recipe, Bank, Template } from "@/lib/types";
const now = Date.now();
const uid = () => Math.random().toString(36).slice(2, 10);
export const INGREDIENT_CATEGORIES = ["Subject","Pose","Expression","Outfit","Hair","Body","Lighting","Camera","Lens","Composition","Style","Color","Mood","Setting","Action","Quality","NSFW"];
function ing(category: string, name: string, value: string, nsfw = false): Ingredient { return { id: uid(), name, category, value, tags: [], nsfw, createdAt: now, updatedAt: now }; }
export const SEED_INGREDIENTS: Ingredient[] = [
  ing("Subject","Female model","a 24-year-old female model"),
  ing("Subject","Male model","a 28-year-old male model"),
  ing("Subject","Fashion influencer","a stylish fashion influencer"),
  ing("Pose","Confident stance","standing confidently, hand on hip"),
  ing("Pose","Over-shoulder glance","looking back over one shoulder"),
  ing("Pose","Seated relaxed","seated relaxed, leaning slightly forward"),
  ing("Pose","Walking toward camera","walking toward the camera mid-stride"),
  ing("Expression","Soft smile","a soft, natural smile"),
  ing("Expression","Playful","a playful, flirtatious expression"),
  ing("Expression","Serene","a calm, serene expression"),
  ing("Outfit","Summer dress","wearing a flowing summer dress"),
  ing("Outfit","Streetwear","wearing oversized streetwear and sneakers"),
  ing("Outfit","Evening gown","wearing an elegant evening gown"),
  ing("Outfit","Lingerie set","wearing a coordinated lingerie set", true),
  ing("Outfit","Boudoir robe","wearing a sheer silk robe in a boudoir setting", true),
  ing("Hair","Long waves","long wavy hair"),
  ing("Hair","Sleek bob","a sleek dark bob"),
  ing("Hair","Messy bun","hair in a loose messy bun"),
  ing("Body","Athletic","athletic, toned build"),
  ing("Body","Curvy","curvy hourglass figure"),
  ing("Body","Slim","slim, slender build"),
  ing("Lighting","Golden hour","warm golden-hour sunlight"),
  ing("Lighting","Soft rim light","soft rim lighting outlining the subject"),
  ing("Lighting","Studio softbox","even studio softbox lighting"),
  ing("Lighting","Neon glow","moody neon glow, magenta and cyan"),
  ing("Lighting","Window light","soft directional window light"),
  ing("Camera","DSLR full-frame","shot on a full-frame DSLR"),
  ing("Camera","Cinematic","cinematic film look, shallow depth of field"),
  ing("Camera","Phone candid","candid smartphone photo aesthetic"),
  ing("Lens","85mm portrait","85mm portrait lens, creamy bokeh"),
  ing("Lens","35mm wide","35mm lens, environmental framing"),
  ing("Lens","Macro detail","macro lens, fine detail"),
  ing("Composition","Close-up","tight close-up portrait"),
  ing("Composition","Full body","full-body shot"),
  ing("Composition","Rule of thirds","composed on the rule of thirds"),
  ing("Composition","Low angle","dramatic low camera angle"),
  ing("Style","Photorealistic","photorealistic, highly detailed"),
  ing("Style","Editorial fashion","high-fashion editorial style"),
  ing("Style","Anime","anime illustration style"),
  ing("Style","Film noir","black-and-white film noir style"),
  ing("Color","Warm pastel","warm pastel color palette"),
  ing("Color","Teal & orange","teal and orange cinematic grade"),
  ing("Color","Muted earth","muted earth tones"),
  ing("Mood","Dreamy","dreamy, ethereal mood"),
  ing("Mood","Bold","bold and powerful mood"),
  ing("Mood","Intimate","warm, intimate mood", true),
  ing("Setting","Beach","on a sunlit sandy beach"),
  ing("Setting","Luxury bedroom","in a luxury hotel bedroom", true),
  ing("Setting","City rooftop","on a city rooftop at dusk"),
  ing("Setting","Studio backdrop","against a seamless studio backdrop"),
  ing("Action","Adjusting hair","adjusting her hair"),
  ing("Action","Laughing","caught mid-laugh"),
  ing("Action","Stretching","stretching gracefully"),
  ing("Quality","8K detail","8k, ultra-detailed, sharp focus"),
  ing("Quality","Skin texture","natural skin texture, no plastic look"),
  ing("Quality","Pro retouch","professional retouching"),
  ing("NSFW","Implied nude","tasteful implied nude, strategically covered", true),
  ing("NSFW","Boudoir","boudoir photography style", true),
  ing("NSFW","Custom (add your own)","", true),
];
function prompt(category: string, title: string, body: string, mediaType: PromptItem["mediaType"] = "image", nsfw = false): PromptItem { return { id: uid(), title, category, body, tags: [], nsfw, mediaType, createdAt: now, updatedAt: now }; }
export const SEED_PROMPTS: PromptItem[] = [
  prompt("General","Default Image-to-Prompt","Describe this image in detail.","text"),
  prompt("General","Scene Description","Provide a comprehensive scene description. Include setting, lighting, atmosphere, and mood.","text"),
  prompt("General","Color Palette","Analyze the color palette of this image. Provide HEX codes for dominant, accent, and background colors, and suggest a name for the palette.","text"),
  prompt("Captioning","Stable Diffusion Tags","Write a comma-separated Stable Diffusion prompt describing this image: subject, style, lighting, camera, quality tags.","text"),
  prompt("Captioning","MidJourney Prompt","Write a vivid MidJourney prompt for this image including --ar and --style hints.","text"),
  prompt("Captioning","Danbooru Tags","List Danbooru-style tags for this image, comma separated, ordered by importance.","text"),
  prompt("Influencer","Instagram Caption","Write an engaging, on-brand Instagram caption for this photo with 5 relevant hashtags.","text"),
  prompt("Influencer","Persona Consistency Check","Compare this image to the reference character and list any differences in face, hair, body, or styling.","text"),
  prompt("Video","T2V Cinematic","Rewrite this idea into a cinematic text-to-video prompt: describe camera movement, pacing, lighting, and subject action in 80-100 words.","video"),
  prompt("Video","I2V Motion","Given this still image, describe natural motion, camera movement, and a 5-second action for image-to-video generation.","video"),
  prompt("Surprise Me","Surprise me — image","Write a highly detailed, creative, unique prompt for an AI image generator. Output only the prompt.","text"),
  prompt("Surprise Me","Surprise me — edit","Suggest a creative, specific edit for this image, starting with an action verb (Convert, Make, Add, Turn).","text"),
  prompt("Adult / NSFW","Boudoir caption","Write a tasteful, suggestive caption for an adult-creator boudoir photo. Keep it flirtatious and brand-appropriate.","image", true),
  prompt("Adult / NSFW","Custom NSFW prompt (edit me)","","image", true),
];
function env(name: string, category: string, description: string, lighting: string, mood: string, nsfw = false): EnvironmentItem { return { id: uid(), name, category, description, lighting, mood, timeOfDay: "", tags: [], nsfw, createdAt: now, updatedAt: now }; }
export const SEED_ENVIRONMENTS: EnvironmentItem[] = [
  env("Sunlit Beach","Outdoor","a quiet tropical beach with soft sand and gentle waves","warm golden-hour sun","relaxed, breezy"),
  env("City Rooftop Dusk","Urban","a modern city rooftop overlooking a glowing skyline","blue hour + neon spill","cinematic, aspirational"),
  env("Minimal Studio","Studio","a seamless paper studio backdrop, professional set","even softbox lighting","clean, editorial"),
  env("Luxury Hotel Suite","Indoor","a luxury hotel suite with floor-to-ceiling windows","soft directional window light","intimate, upscale", true),
  env("Cozy Bedroom","Indoor","a warm, cozy bedroom with linen sheets and fairy lights","soft warm lamplight","intimate, relaxed", true),
  env("Forest Clearing","Nature","a misty forest clearing with dappled light","dappled sunlight through trees","ethereal, calm"),
  env("Neon Alley","Urban","a rain-slick neon-lit alley at night","magenta and cyan neon","moody, edgy"),
  env("Poolside","Outdoor","a luxury poolside with loungers and palm shadows","bright midday sun","playful, glam"),
];
function recipe(title: string, category: string, mediaType: Recipe["mediaType"], slots: [string, string][], nsfw = false): Recipe { return { id: uid(), title, category, mediaType, description: `${title} template`, slots: slots.map(([cat, label]) => ({ id: uid(), category: cat, label, optional: false })), templateString: "", tags: [], nsfw, createdAt: now, updatedAt: now }; }
export const SEED_RECIPES: Recipe[] = [
  recipe("Editorial Portrait","Portrait","image",[["Subject","Subject"],["Pose","Pose"],["Outfit","Outfit"],["Lighting","Lighting"],["Lens","Lens"],["Style","Style"],["Quality","Quality"]]),
  recipe("Lifestyle Influencer Shot","Influencer","image",[["Subject","Subject"],["Outfit","Outfit"],["Setting","Setting"],["Action","Action"],["Lighting","Lighting"],["Camera","Camera"],["Color","Color"]]),
  recipe("Cinematic Beauty Close-up","Portrait","image",[["Subject","Subject"],["Expression","Expression"],["Hair","Hair"],["Lighting","Lighting"],["Composition","Composition"],["Quality","Quality"]]),
  recipe("Boudoir Set","Adult / NSFW","image",[["Subject","Subject"],["Body","Body"],["Outfit","Outfit"],["Pose","Pose"],["Setting","Setting"],["Lighting","Lighting"],["Mood","Mood"],["NSFW","NSFW"]], true),
  recipe("T2V Reveal Clip","Video","video",[["Subject","Subject"],["Action","Action"],["Setting","Setting"],["Lighting","Lighting"],["Camera","Camera"],["Mood","Mood"]]),
];


function sys(subcategory: string, title: string, body: string, modes: string[] = ["T2T"], nsfw = false): PromptItem {
  const mediaType: PromptItem["mediaType"] = modes.some((m) => m.includes("V")) ? "video" : modes.some((m) => m.includes("I")) ? "image" : "text";
  return { id: uid(), title, category: "System Prompt", subcategory, body, tags: [], modes, nsfw, mediaType, createdAt: now, updatedAt: now };
}

// Built-in System Prompts grouped into subcategories that mirror the original app.
// Mode tags: T2I/I2I/I2T/IT2I (image), T2V/I2V/V2V/IT2V/V2T/VT2T (video), T2T (text).
// Import your original predefined_prompts.json to add the full set (incl. your own) under these subcategories.
export const SYSTEM_PROMPTS: PromptItem[] = [
  sys("General", "No System Prompt", "", ["T2T"]),
  sys("General", "Default Image-to-Prompt", "Describe this image in detail.", ["I2T"]),
  sys("General", "Story Starter", "Use the image as inspiration to write the opening of a short story.", ["I2T", "T2T"]),
  sys("General", "Scene Description", "Provide a comprehensive scene description covering setting, lighting, atmosphere, and mood.", ["I2T"]),
  sys("Captioning", "Stable Diffusion", "Write a comma-separated Stable Diffusion prompt: subject, descriptors, style, lighting, camera, quality tags.", ["I2T"]),
  sys("Captioning", "MidJourney", "Write a vivid MidJourney prompt for this image, ending with appropriate --ar and --style parameters.", ["I2T"]),
  sys("Captioning", "Booru Tags", "List booru-style tags for this image, comma-separated, ordered by importance.", ["I2T"]),
  sys("Image Editing", "Character Stability (Image Editing)", "Edit the image while preserving the subject's identity, facial structure and key features. Output only the edit instruction.", ["IT2I"]),
  sys("Image Editing", "Flux Image Editing", "Write a Flux image-editing instruction describing the change while keeping composition coherent.", ["I2I", "IT2I"]),
  sys("Image Editing", "Qwen Edit", "Write a precise Qwen image-editing instruction for the requested change.", ["IT2I"]),
  sys("Image Generation", "Flux Image", "Write a Flux text-to-image prompt: subject, style, lighting, lens and quality tags.", ["T2I"]),
  sys("Image Generation", "FLUX Prompt Pro", "Expand the idea into a rich Flux prompt with scene, subject detail, lighting, camera and mood.", ["T2I", "I2I"]),
  sys("Image Generation", "Z-Image", "Write a Z-Image prompt focused on clean composition and subject clarity.", ["T2I"]),
  sys("Image Generation", "PonyXL Image", "Write a PonyXL prompt with score tags, subject, style and quality descriptors.", ["I2I"]),
  sys("Nexusai", "Nexusai Prompt Enhancer", "Rewrite into a detailed Nexusai prompt. Output only the prompt.", ["T2I", "I2I", "IT2I"]),
  sys("ChatGPT", "ChatGPT Image Prompt Enhancer", "Rewrite into a clear, vivid image prompt suitable for GPT image models. Output only the prompt.", ["T2I", "IT2I"]),
  sys("Nexusai JSON", "Nexusai JSON Prompt Generator", "Convert the idea into a structured Nexusai JSON spec. Output only JSON.", ["T2I", "I2I", "IT2I"]),
  sys("VEO JSON", "VEO JSON Prompt Generator", "Convert the idea into a structured Veo JSON video spec (subject, camera_movement, lighting, pacing, audio, master_prompt). Output only JSON.", ["T2V", "IT2V", "VT2T"]),
  sys("Prompt Enhancement", "Flux Prompt Enhance", "Enhance the user's prompt into a vivid Flux image prompt. Output only the prompt.", ["T2I"]),
  sys("Prompt Enhancement", "SDXL Prompt Enhance", "Enhance into a detailed SDXL prompt with quality tags.", ["T2I", "I2I"]),
  sys("Prompt Enhancement", "PonyXL Prompt Enhance", "Enhance into a PonyXL-style prompt with score and style tags.", ["T2I"]),
  sys("Photography Analysis", "Technical Photo Analysis", "Describe camera, lens, focal length, aperture, lighting setup and composition for this photo.", ["I2T"]),
  sys("Photography Analysis", "Portrait Analysis", "Analyze this portrait: lighting pattern, lens, pose, expression and retouching.", ["I2T"]),
  sys("Tagging", "WD Tagger", "Output comma-separated WD-style tags for this image, most important first.", ["I2T"]),
  sys("Video Generation", "Wan 2.1 I2V", "Rewrite into a Wan 2.1 image-to-video prompt emphasizing natural motion, camera movement and subject action. ~80-100 words, English only.", ["I2V", "IT2V"]),
  sys("Video Generation", "Wan 2.2", "Rewrite into a Wan 2.2 prompt with smooth motion and a clear action beat.", ["T2V", "I2V"]),
  sys("Video Generation", "LTX-2 Master Prompt", "Rewrite into an LTX-2 prompt: subject, motion, camera movement, lighting and pacing in 70-90 words. Output only the prompt.", ["T2V", "I2V"]),
  sys("Video Generation", "MidJourney Video", "Write a MidJourney video prompt: vivid scene, motion cues and camera direction.", ["T2V", "I2V"]),
  sys("Video Generation", "Veo 3 Cinematic", "Rewrite into a cinematic Veo 3 prompt: shot type, camera movement, lighting, mood, pacing and audio. ~80-100 words.", ["T2V", "IT2V"]),
  sys("Video Generation", "Kling 2.0", "Rewrite into a Kling 2.0 prompt focused on smooth realistic motion and framing.", ["T2V", "I2V"]),
  sys("Video Analysis", "AI Video Reverse Engineer", "Watch the video and reconstruct the prompt that could have generated it: subject, motion, camera, style.", ["V2T", "VT2T"]),
  sys("Video Analysis", "Summarize Video", "Summarize what happens in this video, scene by scene.", ["V2T"]),
  sys("Video Analysis", "Video Describe", "Describe the video's subject, action, camera movement and mood.", ["V2T"]),
  sys("Surprise Me", "Surprise — Image", "Write a single highly detailed, creative, unique image generation prompt. Output only the prompt.", ["T2I"]),
  sys("Audio Generation", "Sound Design", "Describe a sound/music prompt for this scene: instrumentation, mood, tempo and ambience.", ["T2T"]),
  sys("3D Generation", "3D Asset Prompt", "Write a prompt for a 3D asset generator: object, materials, topology hints and style.", ["T2I"]),
  sys("UI/UX Design", "UI Mockup Prompt", "Write a prompt for a UI mockup: app type, screen, layout, components and visual style.", ["T2I"]),
];


// ===== Nexus Studio: Banks (variables) & Templates =====
function bank(id: string, name: string, category: string, options: string[], nsfw = false): Bank {
  return { id, name, category, options, nsfw, createdAt: now, updatedAt: now };
}
export const SEED_BANKS: Bank[] = [
  bank("role", "Role", "character", ["Master of Game and Anime Concept Art", "Senior Film Character Concept Artist", "Cyberpunk Style Designer", "Dark Fantasy Style Illustrator", "Fine-art photography blended with cinematic realism"]),
  bank("subject", "Subject", "character", ["Female Character", "Male Character", "Mecha Girl", "Monster Anthropomorphism", "Fantasy Race (Elf/Demon)", "Female, around 20 years old", "Young Korean female K-pop idol"]),
  bank("hair_style", "Hair Style", "character", ["Short, softly tousled dark hair", "Dark wavy long hair", "Black straight hair, falling over shoulders", "Light blonde curly hair", "High ponytail"]),
  bank("character_companion", "Companion", "character", ["Deadpool", "Superman", "Einstein", "Wonder Woman", "Iron Man", "Pikachu", "Godzilla", "Hatsune Miku"]),
  bank("expressions", "Expressions", "character", ["a soft natural smile", "a playful flirtatious look", "a calm serene expression", "a determined gaze", "caught mid-laugh"]),
  bank("art_style", "Art Style", "visual", ["High-quality 2D illustration style", "Ukiyo-e", "Cubism", "Surrealism", "Realism", "Realistic impasto style", "Cyberpunk neon style", "Watercolor hand-drawn style"]),
  bank("line_art_style", "Line Art Style", "visual", ["fine ink linework", "bold clean outlines", "rough sketch lines", "no visible linework"]),
  bank("shading_technique", "Shading Technique", "visual", ["minimal shading", "soft cel shading", "crosshatching", "halftone shading"]),
  bank("lens_parameter", "Lens Parameter", "other", ["85mm, f/1.8", "85mm, f/2.0", "50mm, f/2.2", "50mm, f/2.5", "35mm, f/4.5", "50mm, f/1.8", "85mm, f/2.2"]),
  bank("drink_product", "Drink Product", "item", ["Fanta softdrink can", "Coca-Cola can", "Pepsi cola can", "Sprite soda can", "Red Bull energy drink can", "Beer can", "Orange juice bottle", "Sports drink bottle"]),
  bank("drink_photography_background", "Drink Background", "location", ["orange background", "blue background", "red background", "gradient studio background", "wet stone surface"]),
  bank("design_sheet_type", "Design Sheet Type", "other", ["character turnaround sheet", "expression sheet", "pose study", "model sheet"]),
];

function tmpl(name: string, mediaType: Template["mediaType"], content: string, tags: string[], selections: Record<string, string> = {}, nsfw = false, bestModel?: string): Template {
  return { id: uid(), name, content, mediaType, selections, tags, nsfw, bestModel, createdAt: now, updatedAt: now };
}
export const SEED_TEMPLATES: Template[] = [
  tmpl("Editorial Portrait", "image",
    "A {{art_style}} photo of {{subject}}, with {{hair_style}}, showing {{expressions}}, shot on {{lens_parameter}}, professional lighting, highly detailed.",
    ["character", "photography"], { art_style: "Realism" }, false, "Nexus AI Studio"),
  tmpl("Product Drink Shot", "image",
    "Professional photo of a {{drink_product}}. On a {{drink_photography_background}}. The {{drink_product}} is {{drink_effect: exploding with oranges and splashes}}. The liquid is swirling around the can, with highlights and shadows on the backdrop. {{camera_angle: high angle overhead shot}}, taken with a DSLR {{lens_parameter}}.",
    ["product", "photography"], { drink_product: "Fanta softdrink can", drink_photography_background: "orange background" }, false, "Nexus AI Studio"),
  tmpl("Character Design Sheet", "image",
    "Character design sheet for a {{character_animal: fox}} named {{character_name: June}}, toddler-friendly storybook character, multiple poses and expressions, front view, side view, back view, clean animation model-sheet layout, {{art_style}}, {{line_art_style}}, {{shading_technique}}, white background, professional {{design_sheet_type}}.",
    ["character", "cartoon"], {}, false, "Nexus AI Studio"),
  tmpl("Dynamic Comic Page", "image",
    "single dynamic comic book page, {{comic_subject: two stealthy ninjas}} infiltrating {{comic_location: ancient Japanese temple}} at {{comic_time: night}}, multi-panel layout, bold black panel borders, dramatic high-contrast lighting, thick ink lines, halftone shading, {{comic_art_style: traditional black and white manga style}}.",
    ["creative", "cartoon"], {}, false, "Nexus AI Studio"),
];
