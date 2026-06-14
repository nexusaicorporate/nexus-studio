import type { Character } from "@/lib/types";

export function characterPrompt(c: Character): string {
  return [c.triggerWord, c.appearance, c.bodyAttributes, c.outfitDefaults, c.styleNotes]
    .filter(Boolean)
    .join(", ");
}
