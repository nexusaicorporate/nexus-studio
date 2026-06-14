import type { Recipe, Ingredient } from "@/lib/types";

export function assemble(recipe: Recipe, ingredients: Ingredient[]): string {
  const parts = recipe.slots
    .map((slot) => {
      if (slot.customValue) return slot.customValue;
      const ing = ingredients.find((i) => i.id === slot.ingredientId);
      return ing?.value || "";
    })
    .filter(Boolean);
  if (recipe.templateString.trim()) {
    let out = recipe.templateString;
    recipe.slots.forEach((slot) => {
      const ing = ingredients.find((i) => i.id === slot.ingredientId);
      out = out.replaceAll(`{${slot.label}}`, slot.customValue || ing?.value || "");
    });
    return out;
  }
  return parts.join(", ");
}
