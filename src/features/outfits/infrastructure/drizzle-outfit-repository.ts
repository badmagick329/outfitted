import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { outfitSuggestions, savedOutfits, wardrobeItems } from "@/lib/db/schema";
import type { OutfitRepository } from "../domain/repository";

export class DrizzleOutfitRepository implements OutfitRepository {
  listActiveWardrobe(ownerId: string) {
    return db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.userId, ownerId), isNull(wardrobeItems.archivedAt)));
  }

  async createSuggestion(input: {
    ownerId: string;
    request: string;
    selectedItemIds: string[];
    recommendation: string;
    rationale: string;
  }) {
    const [suggestion] = await db
      .insert(outfitSuggestions)
      .values({
        userId: input.ownerId,
        request: input.request,
        selectedItemIds: input.selectedItemIds,
        recommendation: input.recommendation,
        rationale: input.rationale,
      })
      .returning();
    return suggestion;
  }

  async findSuggestion(ownerId: string, suggestionId: string) {
    const [suggestion] = await db
      .select()
      .from(outfitSuggestions)
      .where(and(eq(outfitSuggestions.id, suggestionId), eq(outfitSuggestions.userId, ownerId)))
      .limit(1);
    return suggestion ?? null;
  }

  async save(ownerId: string, suggestionId: string, name: string) {
    const [saved] = await db
      .insert(savedOutfits)
      .values({ userId: ownerId, suggestionId, name })
      .returning();
    return saved;
  }
}
