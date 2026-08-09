import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ai } from "@/lib/ai";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { outfitSuggestions, wardrobeItems } from "@/lib/db/schema";

const requestSchema = z.object({ prompt: z.string().min(3).max(1000), selectedItemId: z.string().uuid().optional() });
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(); const { prompt, selectedItemId } = requestSchema.parse(await request.json());
    const items = await db.select().from(wardrobeItems).where(and(eq(wardrobeItems.userId, userId), isNull(wardrobeItems.archivedAt)));
    if (selectedItemId && !items.some((item) => item.id === selectedItemId)) return NextResponse.json({ error: "Selected item not found" }, { status: 404 });
    const selected = selectedItemId ? items.find((item) => item.id === selectedItemId) : undefined;
    const result = await ai.suggest(selected ? `${prompt}\nThe user explicitly wants to use: ${selected.name}.` : prompt, items.map(({ id, name, description, category, primaryColor, material, fit, styleTags, seasons, formality }) => ({ id, name, description, category, primaryColor, material, fit, styleTags, seasons, formality })));
    const allowedIds = new Set(items.map((item) => item.id));
    const referencedItemIds = result.referencedItemIds.filter((id) => allowedIds.has(id));
    const [suggestion] = await db.insert(outfitSuggestions).values({ userId, request: prompt, selectedItemIds: referencedItemIds, recommendation: result.recommendation, rationale: result.rationale }).returning();
    return NextResponse.json({ ...suggestion, referencedItemIds }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to suggest an outfit" }, { status: 400 }); }
}
