export interface DirectorBrainContext {
  prompt: string;
  addedAssets: any[];
  generateMode: "video" | "image" | "audio";
  targetModel: string;
}

export class DirectorBrain {
  /**
   * Expands a simple prompt into an 8-dimensional "senior director" prompt 
   * formatted specifically for the target model.
   * Based on Hao0321/ai-media-generator heuristics.
   */
  static expandPrompt(ctx: DirectorBrainContext): string {
    const { prompt, addedAssets, generateMode, targetModel } = ctx;

    // If it's audio mode, route to sound prompt logic
    if (generateMode === "audio") {
      return this.expandAudioPrompt(prompt, addedAssets);
    }

    // 1. Extract intent
    const isCinematic = prompt.toLowerCase().includes("cinematic") || prompt.toLowerCase().includes("movie");
    const isAnime = prompt.toLowerCase().includes("anime") || prompt.toLowerCase().includes("manga");
    
    // 2. Build 8-Dimension components based on target model
    let style = "";
    let camera = "";
    let lighting = "";
    let constraints = "";
    let format = "";

    const lowerModel = targetModel.toLowerCase();

    if (lowerModel.includes("ltx")) {
      style = isCinematic ? "Cinematic lighting, high resolution, photorealistic" : "High quality, crisp details";
      camera = "Slow dolly in, smooth tracking shot";
      lighting = "Volumetric lighting, balanced shadows";
    } else if (lowerModel.includes("kling") || lowerModel.includes("veo")) {
      style = isCinematic ? "Kodak Vision3 500T, epic cinematic scale, masterpiece" : "Highly detailed, stunning visual";
      camera = "Wide establishing shot, panning slowly";
      constraints = "No distortion, stable horizon, no morphing, consistent anatomy.";
    } else if (lowerModel.includes("flux") || lowerModel.includes("midjourney")) {
      style = "--style raw --stylize 750, masterpiece, highly detailed, 8k resolution";
      lighting = "Teal and orange grade, dramatic rim light";
    } else {
      style = "Masterpiece, high quality, highly detailed";
      constraints = "Smooth motion, stable horizon.";
    }

    // 3. Inject Assets
    let subject = prompt;
    const characterAssets = addedAssets.filter(a => a.persona || a.appearance || (a.category === "Characters"));
    const ingredientAssets = addedAssets.filter(a => a.category === "Environment" || a.value);

    if (characterAssets.length > 0) {
      const charDescriptions = characterAssets.map(c => c.appearance || c.name).join(", ");
      subject = `Subject: ${charDescriptions}. Action: ${prompt}`;
    }

    if (ingredientAssets.length > 0) {
      const ingDescriptions = ingredientAssets.map(i => i.value || i.name).join(", ");
      subject += `. Environment: ${ingDescriptions}`;
    }

    // 4. Assemble the final prompt
    const finalPrompt = `
${subject}
Style: ${style}
Camera: ${camera}
Lighting: ${lighting}
${constraints ? `Constraints: ${constraints}` : ""}
    `.trim();

    return finalPrompt;
  }

  static expandAudioPrompt(prompt: string, addedAssets: any[]): string {
    const soundIngredients = addedAssets.filter(a => a.mediaType === "audio" || a.kind === "audio" || a.category === "Sound");
    let base = prompt;
    if (soundIngredients.length > 0) {
      base += " " + soundIngredients.map(s => s.title || s.name).join(", ");
    }
    
    // Audio specific tagging (Suno / ElevenLabs style)
    return `[High Quality, Studio Recording] ${base} [Clear Audio, No Artifacts]`.trim();
  }
}
