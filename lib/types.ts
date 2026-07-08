export type ID = string;
export interface ProviderConfig { id: string; name: string; kind: "openai" | "anthropic" | "google" | "ollama" | "pollinations" | "custom" | "modal"; baseUrl: string; apiKey?: string; models: string[]; selectedModel?: string; visible: boolean; builtIn: boolean; }
export interface PromptItem { id: ID; title: string; category: string; subcategory?: string; modes?: string[]; body: string; tags: string[]; nsfw: boolean; mediaType: "image" | "video" | "audio" | "text"; cover?: string; createdAt: number; updatedAt: number; }
export interface EnvironmentItem {
  id: ID;
  name: string;
  category: string;
  description: string;
  lighting?: string;
  mood?: string;
  timeOfDay?: string;
  tags: string[];
  nsfw: boolean;
  cover?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "none";
  weather?: string;
  architecture?: string;
  cameraAngle?: string;
  negativeModifier?: string;
  createdAt: number;
  updatedAt: number;
}
export interface Ingredient {
  id: ID;
  name: string;
  category: string;
  value: string;
  tags: string[];
  nsfw: boolean;
  createdAt: number;
  updatedAt: number;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "none";
  triggerWord?: string;
  description?: string;
  refWeight?: number;
  influenceType?: string;
  negativeModifier?: string;
}
export interface RecipeSlot { id: ID; category: string; label: string; ingredientId?: ID; customValue?: string; optional: boolean; }
export interface Recipe { id: ID; title: string; category: string; description: string; mediaType: "image" | "video"; slots: RecipeSlot[]; templateString: string; tags: string[]; nsfw: boolean; cover?: string; createdAt: number; updatedAt: number; }
export interface Character {
  id: ID;
  name: string;
  persona: string;
  appearance: string;
  age: string;
  bodyAttributes: string;
  outfitDefaults: string;
  styleNotes: string;
  negative: string;
  triggerWord: string;
  refImages: string[];
  nsfw: boolean;
  gender?: "female" | "male" | "futa" | "trans";
  hairColor?: string;
  hairStyle?: string;
  facialHair?: string;
  bodyShape?: string;
  chestHair?: string;
  breastSize?: string;
  breastShape?: string;
  breastsType?: string;
  assAttributes?: string;
  assSize?: string;
  assShape?: string;
  pubicHair?: string;
  pubicHairAmount?: string;
  pubicHairStyle?: string;
  penisSize?: string;
  penisState?: string;
  penisCircumcised?: "yes" | "no";
  vaginaPiercings?: string;
  bellyPiercing?: string;
  nosePiercing?: string;
  tattooType?: string;
  tattooPlacement?: string;
  sexActivityLevel?: string;
  sexPositions?: string;
  fantasy?: string;
  eyeColor?: string;
  skinTone?: string;
  height?: string;
  bodyBuild?: string;
  loraUrl?: string;
  loraConfigUrl?: string;
  loraStatus?: "none" | "training" | "completed" | "failed";
  loraRequestId?: string;
  loraStatusUrl?: string;
  loraResponseUrl?: string;
  characterSheetUrl?: string;
  xray?: CharacterXRay;
  createdAt: number;
  updatedAt: number;
}
export interface CharacterXRay {
  skin: string;
  muscles: string;
  bones: string;
  heart: string;
  nervousSystem: string;
  metrics: {
    maskDensity: number;
    egoStability: number;
    vulnerabilityQuotient: number;
    empathicResonance: number;
  };
  writingPrompts: string[];
}
export interface GenAsset { id: ID; kind: "image" | "video"; url: string; prompt: string; meta: Record<string, any>; characterId?: ID; createdAt: number; }
export interface Conversation { id: ID; title: string; messages: ChatMessage[]; createdAt: number; updatedAt: number; }
export interface ChatMessage { id: ID; role: "user" | "assistant" | "system"; content: string; images?: string[]; videos?: string[]; model?: string; }

export interface Bank { id: ID; name: string; category: string; options: string[]; nsfw?: boolean; createdAt: number; updatedAt: number; }
export interface Template {
  id: ID; name: string; content: string; mediaType: "image" | "video";
  cover?: string; videoUrl?: string;
  selections: Record<string, string>;
  tags: string[]; nsfw: boolean; author?: string; bestModel?: string;
  createdAt: number; updatedAt: number;
}

export interface ComfyProvider {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
}

export interface ComfyModelMapping {
  id: string;
  name: string;
  source: "civitai" | "huggingface";
  repoOrModelId: string;
  versionId?: string;
  filename: string;
  downloadUrl: string;
}

export interface ComfyWorkflow {
  id: string;
  name: string;
  description: string;
  json: string;
  createdAt: number;
  updatedAt: number;
}

export interface CinemaScene {
  id: string;
  order: number;
  templateId?: string;       // The recipe/template used
  prompt: string;            // The final assembled prompt
  characterIds: string[];    // Linked characters
  ingredientIds: string[];   // Linked ingredients
  duration?: number;
  assetId?: string;          // If rendered
  videoUrl?: string;         // Direct video URL/file path
  mediaType?: "video" | "image" | "audio";
}

export interface CinemaProject {
  id: string;
  title: string;
  description: string;
  scenes: CinemaScene[];
  createdAt: number;
  updatedAt: number;
}

