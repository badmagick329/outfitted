import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemPhotos, wardrobeItems } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

export async function GET(_request: Request, context: RouteContext<"/api/photos/[id]">) {
  const userId = await requireUserId(); const { id } = await context.params;
  const [photo] = await db.select({ storageKey: itemPhotos.storageKey }).from(itemPhotos).innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id)).where(and(eq(itemPhotos.id, id), eq(wardrobeItems.userId, userId))).limit(1);
  if (!photo) return new NextResponse(null, { status: 404 });
  const image = await storage.read(photo.storageKey); return new NextResponse(new Uint8Array(image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
}
