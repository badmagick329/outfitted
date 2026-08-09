import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { outfitSuggestions, savedOutfits } from "@/lib/db/schema";

export async function POST(request: Request) {
  const userId = await requireUserId();
  const { suggestionId, name } = z
    .object({ suggestionId: z.string().uuid(), name: z.string().min(1).max(160) })
    .parse(await request.json());
  const [suggestion] = await db
    .select()
    .from(outfitSuggestions)
    .where(and(eq(outfitSuggestions.id, suggestionId), eq(outfitSuggestions.userId, userId)))
    .limit(1);
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [saved] = await db.insert(savedOutfits).values({ userId, suggestionId, name }).returning();
  return NextResponse.json(saved, { status: 201 });
}
