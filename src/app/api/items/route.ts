import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { itemPhotos, wardrobeItems } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth";
import { enqueueAnalysis } from "@/lib/jobs";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 12 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(); const formData = await request.formData();
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File);
    if (!files.length || files.length > 6) return NextResponse.json({ error: "Upload between 1 and 6 photos." }, { status: 400 });
    for (const file of files) if (!file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Each file must be an image under 12MB." }, { status: 400 });
    const [item] = await db.insert(wardrobeItems).values({ userId, name: String(formData.get("name") || "New garment") }).returning();
    const saved = await Promise.all(files.map(async (file) => storage.saveImage(Buffer.from(await file.arrayBuffer()), userId)));
    await db.insert(itemPhotos).values(saved.map((image, position) => ({ itemId: item.id, storageKey: image.key, width: image.width, height: image.height, position })));
    await enqueueAnalysis(item.id);
    return NextResponse.json({ itemId: item.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 401 }); }
}
