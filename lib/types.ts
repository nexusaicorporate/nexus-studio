export type ID = string;
export interface ProviderConfig { id: string; name: string; kind: "openai" | "anthropic" | "google" | "ollama" | "pollinations" | "custom"; baseUrl: string; apiKey?: string; models: string[]; selectedModel?: string; visible: boolean; builtIn: boolean; }
export interface PromptItem { id: ID; title: string; category: string; subcategory?: string; modes?: string[]; body: string; tags: string[]; nsfw: boolean; mediaType: "image" | "video" | "text"; cover?: string; createdAt: number; updatedAt: number; }
export interface EnvironmentItem { id: ID; name: string; category: string; description: string; lighting?: string; mood?: string; timeOfDay?: string; tags: string[]; nsfw: boolean; cover?: string; createdAt: number; updatedAt: number; }
export interface Ingredient { id: ID; name: string; category: string; value: string; tags: string[]; nsfw: boolean; createdAt: number; updatedAt: number; }
export interface RecipeSlot { id: ID; category: string; label: string; ingredientId?: ID; customValue?: string; optional: boolean; }
export interface Recipe { id: ID; title: string; category: string; description: string; mediaType: "image" | "video"; slots: RecipeSlot[]; templateString: string; tags: string[]; nsfw: boolean; cover?: string; createdAt: number; updatedAt: number; }
export interface Character { id: ID; name: string; persona: string; appearance: string; age: string; bodyAttributes: string; outfitDefaults: string; styleNotes: string; negative: string; triggerWord: string; refImages: string[]; nsfw: boolean; createdAt: number; updatedAt: number; }
export interface GenAsset { id: ID; kind: "image" | "video"; url: string; prompt: string; meta: Record<string, any>; characterId?: ID; createdAt: number; }
export interface Conversation { id: ID; title: string; messages: ChatMessage[]; createdAt: number; updatedAt: number; }
export interface ChatMessage { id: ID; role: "user" | "assistant" | "system"; content: string; images?: string[]; model?: string; }

export interface Bank { id: ID; name: string; category: string; options: string[]; nsfw?: boolean; createdAt: number; updatedAt: number; }
export interface Template {
  id: ID; name: string; content: string; mediaType: "image" | "video";
  cover?: string; videoUrl?: string;
  selections: Record<string, string>;
  tags: string[]; nsfw: boolean; author?: string; bestModel?: string;
  createdAt: number; updatedAt: number;
}
