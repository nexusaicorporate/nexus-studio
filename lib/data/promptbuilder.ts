export const PROMPT_BUILDER = {
  captionTypes: [
    { name: "Descriptive", prompt: "Write a clear, detailed natural-language description of this image." },
    { name: "Descriptive (casual)", prompt: "Write a casual, conversational description of this image." },
    { name: "Stable Diffusion Prompt", prompt: "Write a comma-separated Stable Diffusion prompt for this image: subject, descriptors, style, lighting, camera, quality tags." },
    { name: "MidJourney Prompt", prompt: "Write a vivid MidJourney prompt for this image, ending with relevant --ar and --style parameters." },
    { name: "Danbooru tags", prompt: "List Danbooru-style tags for this image, comma-separated, ordered by importance." },
    { name: "Booru-like tags", prompt: "Write booru-like tags describing the subject, setting, and style." },
    { name: "Art Critic", prompt: "Analyze this image as an art critic: composition, technique, color theory, and mood." },
    { name: "Product Listing", prompt: "Write an e-commerce product description for the main item in this image." },
    { name: "Social Media", prompt: "Write a short, engaging social-media caption for this image with a few hashtags." },
    { name: "Photography", prompt: "Describe this image with photographic detail: camera angle, lens, lighting setup, and composition." },
    { name: "Training Caption", prompt: "Write a concise training caption describing the subject and key attributes for model fine-tuning." },
  ],
  lengths: ["Very short (20-40 words)", "Short", "Medium", "Long", "Very long", "50 words", "100 words", "150 words", "200 words", "260 words"],
  extras: ["Include lighting", "Include camera angle", "Include composition", "No ethnicity", "No watermark mentions", "Emphasize aesthetic quality", "Include background detail", "Include clothing detail", "Include mood", "Keep it brand-safe", "Single line output"],
};
