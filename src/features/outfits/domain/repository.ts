import type {
  ignoredOutfits,
  outfitSuggestions,
  savedOutfits,
  wardrobeItems,
} from "@/lib/db/schema";
import type { OutfitSelectionDiagnosticsV1 } from "../application/outfit-candidate-selection";

export type OutfitWardrobeItem = typeof wardrobeItems.$inferSelect;
export type OutfitSuggestionRecord = typeof outfitSuggestions.$inferSelect;
export type SavedOutfit = typeof savedOutfits.$inferSelect;
export type IgnoredOutfit = typeof ignoredOutfits.$inferSelect;
export type SavedOutfitWithSuggestion = {
  saved: SavedOutfit;
  suggestion: OutfitSuggestionRecord;
};

export interface OutfitRepository {
  listActiveWardrobe(ownerId: string): Promise<OutfitWardrobeItem[]>;
  listRecentSuggestionItemIds(ownerId: string, limit: number): Promise<string[][]>;
  createSuggestion(input: {
    ownerId: string;
    request: string;
    selectedItemIds: string[];
    recommendation: string;
    rationale: string;
    diagnostics: OutfitSelectionDiagnosticsV1;
  }): Promise<OutfitSuggestionRecord>;
  findSuggestion(ownerId: string, suggestionId: string): Promise<OutfitSuggestionRecord | null>;
  updateSuggestion(
    ownerId: string,
    suggestionId: string,
    input: {
      selectedItemIds: string[];
      recommendation: string;
      rationale: string | null;
    },
  ): Promise<void>;
  listSaved(ownerId: string): Promise<SavedOutfitWithSuggestion[]>;
  listExcludedItemIds(ownerId: string): Promise<string[][]>;
  findSaved(ownerId: string, suggestionId: string): Promise<SavedOutfit | null>;
  findSavedById(ownerId: string, savedOutfitId: string): Promise<SavedOutfit | null>;
  save(ownerId: string, suggestionId: string, name: string): Promise<SavedOutfit>;
  ignore(input: {
    ownerId: string;
    suggestionId: string;
    selectedItemIds: string[];
    itemSignature: string;
  }): Promise<void>;
  deleteSaved(ownerId: string, savedOutfitId: string): Promise<void>;
}
