import type { outfitSuggestions, savedOutfits, wardrobeItems } from "@/lib/db/schema";

export type OutfitWardrobeItem = typeof wardrobeItems.$inferSelect;
export type OutfitSuggestionRecord = typeof outfitSuggestions.$inferSelect;
export type SavedOutfit = typeof savedOutfits.$inferSelect;

export interface OutfitRepository {
  listActiveWardrobe(ownerId: string): Promise<OutfitWardrobeItem[]>;
  createSuggestion(input: {
    ownerId: string;
    request: string;
    selectedItemIds: string[];
    recommendation: string;
    rationale: string;
  }): Promise<OutfitSuggestionRecord>;
  findSuggestion(ownerId: string, suggestionId: string): Promise<OutfitSuggestionRecord | null>;
  save(ownerId: string, suggestionId: string, name: string): Promise<SavedOutfit>;
}
