import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { enqueueAnalysis } from "@/lib/jobs";
import { storage } from "@/lib/storage";
import { getOwnedItem, getOwnedPhotos } from "@/lib/wardrobe";

export async function PATCH(request: Request, context: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  const { id } = await context.params;
  const body = await request.json();
  const item = await getOwnedItem(userId, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = [
    "name",
    "description",
    "category",
    "primaryColor",
    "secondaryColors",
    "material",
    "fit",
    "styleTags",
    "seasons",
    "formality",
    "archivedAt",
  ] as const;
  const values = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key as (typeof allowed)[number])),
  );
  await db
    .update(wardrobeItems)
    .set({ ...values, metadataEditedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)));
  return NextResponse.json({ ok: true });
}
export async function DELETE(_request: Request, context: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  const { id } = await context.params;
  const item = await getOwnedItem(userId, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  for (const photo of await getOwnedPhotos(userId, id)) await storage.delete(photo.storageKey);
  await db
    .delete(wardrobeItems)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)));
  return new NextResponse(null, { status: 204 });
}
export async function POST(_request: Request, context: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  const { id } = await context.params;
  const item = await getOwnedItem(userId, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db
    .update(wardrobeItems)
    .set({ analysisStatus: "pending", analysisError: null, updatedAt: new Date() })
    .where(eq(wardrobeItems.id, id));
  await enqueueAnalysis(id);
  return NextResponse.json({ ok: true });
}
