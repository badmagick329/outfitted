import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { ignoredOutfits, outfitSuggestions, savedOutfits, wardrobeItems } from "@/lib/db/schema";
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

  async updateSuggestion(
    ownerId: string,
    suggestionId: string,
    input: {
      selectedItemIds: string[];
      recommendation: string;
      rationale: string | null;
    },
  ) {
    await db
      .update(outfitSuggestions)
      .set({
        selectedItemIds: input.selectedItemIds,
        recommendation: input.recommendation,
        rationale: input.rationale,
        updatedAt: new Date(),
      })
      .where(and(eq(outfitSuggestions.id, suggestionId), eq(outfitSuggestions.userId, ownerId)));
  }

  listSaved(ownerId: string) {
    return db
      .select({ saved: savedOutfits, suggestion: outfitSuggestions })
      .from(savedOutfits)
      .innerJoin(outfitSuggestions, eq(savedOutfits.suggestionId, outfitSuggestions.id))
      .where(eq(savedOutfits.userId, ownerId))
      .orderBy(desc(savedOutfits.createdAt));
  }

  async listExcludedItemIds(ownerId: string) {
    const [saved, ignored] = await Promise.all([
      db
        .select({ selectedItemIds: outfitSuggestions.selectedItemIds })
        .from(savedOutfits)
        .innerJoin(outfitSuggestions, eq(savedOutfits.suggestionId, outfitSuggestions.id))
        .where(eq(savedOutfits.userId, ownerId)),
      db
        .select({ selectedItemIds: ignoredOutfits.selectedItemIds })
        .from(ignoredOutfits)
        .where(eq(ignoredOutfits.userId, ownerId)),
    ]);
    return [...saved, ...ignored].map(({ selectedItemIds }) => selectedItemIds);
  }

  async findSaved(ownerId: string, suggestionId: string) {
    const [saved] = await db
      .select()
      .from(savedOutfits)
      .where(and(eq(savedOutfits.userId, ownerId), eq(savedOutfits.suggestionId, suggestionId)))
      .limit(1);
    return saved ?? null;
  }

  async findSavedById(ownerId: string, savedOutfitId: string) {
    const [saved] = await db
      .select()
      .from(savedOutfits)
      .where(and(eq(savedOutfits.userId, ownerId), eq(savedOutfits.id, savedOutfitId)))
      .limit(1);
    return saved ?? null;
  }

  async save(ownerId: string, suggestionId: string, name: string) {
    const [saved] = await db
      .insert(savedOutfits)
      .values({ userId: ownerId, suggestionId, name })
      .returning();
    return saved;
  }

  async ignore(input: {
    ownerId: string;
    suggestionId: string;
    selectedItemIds: string[];
    itemSignature: string;
  }) {
    await db
      .insert(ignoredOutfits)
      .values({
        userId: input.ownerId,
        suggestionId: input.suggestionId,
        selectedItemIds: input.selectedItemIds,
        itemSignature: input.itemSignature,
      })
      .onConflictDoNothing();
  }

  async deleteSaved(ownerId: string, savedOutfitId: string) {
    await db
      .delete(savedOutfits)
      .where(and(eq(savedOutfits.userId, ownerId), eq(savedOutfits.id, savedOutfitId)));
  }
}
