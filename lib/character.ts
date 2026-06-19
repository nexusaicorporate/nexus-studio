import type { Character } from "@/lib/types";

export function characterPrompt(c: Character): string {
  const parts: string[] = [];

  if (c.triggerWord) parts.push(c.triggerWord);
  if (c.persona) parts.push(c.persona);
  
  // Normal physical attributes
  const hair = [c.hairStyle, c.hairColor].filter(Boolean).join(", ");
  if (hair) parts.push(`${hair} hair`);
  if (c.bodyShape) parts.push(`${c.bodyShape} body shape`);
  if (c.eyeColor) parts.push(`${c.eyeColor} eyes`);
  if (c.skinTone) parts.push(`${c.skinTone} skin`);
  if (c.height) parts.push(`${c.height} height`);
  if (c.bodyBuild) parts.push(`${c.bodyBuild} body build`);
  
  if (c.appearance) parts.push(c.appearance);
  if (c.bodyAttributes) parts.push(c.bodyAttributes);
  
  // NSFW attributes
  if (c.nsfw) {
    const breasts = [c.breastSize, c.breastShape].filter(Boolean).join(" ");
    if (breasts) {
      parts.push(`${breasts} breasts${c.breastsType ? ` (${c.breastsType})` : ""}`);
    }
    const ass = [c.assSize, c.assShape].filter(Boolean).join(" ");
    if (ass) {
      parts.push(`${ass} ass`);
    } else if (c.assAttributes) {
      parts.push(`${c.assAttributes} ass`);
    }
    
    if (c.pubicHair === "no") {
      parts.push("completely shaved pubic area, smooth hairless skin");
    } else if (c.pubicHair === "yes") {
      const pubicDetails = [c.pubicHairStyle, c.pubicHairAmount].filter(Boolean).join(" ");
      parts.push(`${pubicDetails || "natural"} pubic hair`);
    }
    
    // Piercings
    if (c.vaginaPiercings && c.vaginaPiercings !== "none") parts.push(`vagina piercing (${c.vaginaPiercings})`);
    if (c.bellyPiercing === "yes") parts.push("belly button piercing");
    if (c.nosePiercing === "yes") parts.push("nose piercing");
    
    // Tattoos
    if (c.tattooType && c.tattooType !== "none") {
      parts.push(`${c.tattooType} tattoo${c.tattooPlacement ? ` on ${c.tattooPlacement}` : ""}`);
    }
    
    if (c.sexActivityLevel && c.sexActivityLevel !== "none") parts.push(`${c.sexActivityLevel} sexual demeanor`);
    if (c.sexPositions) parts.push(`favorite position: ${c.sexPositions}`);
    if (c.fantasy) parts.push(`erotic fantasy: ${c.fantasy}`);
  }

  if (c.outfitDefaults) parts.push(c.outfitDefaults);
  if (c.styleNotes) parts.push(c.styleNotes);

  return parts.filter(Boolean).join(", ");
}
