import type { OutfitSuggestion } from "@/lib/ai";

export type OutfitAi = {
  suggest(prompt: string, wardrobe: unknown[]): Promise<OutfitSuggestion>;
};
