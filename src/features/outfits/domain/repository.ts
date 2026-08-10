import type { outfitSuggestions, savedOutfits, wardrobeItems } from "@/lib/db/schema";

export type OutfitWardrobeItem = typeof wardrobeItems.$inferSelect;
export type OutfitSuggestionRecord = typeof outfitSuggestions.$inferSelect;
export type SavedOutfit = typeof savedOutfits.$inferSelect;
export type SavedOutfitWithSuggestion = {
  saved: SavedOutfit;
  suggestion: OutfitSuggestionRecord;
};

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
  listSaved(ownerId: string): Promise<SavedOutfitWithSuggestion[]>;
  findSaved(ownerId: string, suggestionId: string): Promise<SavedOutfit | null>;
  findSavedById(ownerId: string, savedOutfitId: string): Promise<SavedOutfit | null>;
  save(ownerId: string, suggestionId: string, name: string): Promise<SavedOutfit>;
  deleteSaved(ownerId: string, savedOutfitId: string): Promise<void>;
}
