import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";

const inProgressStatuses = ["pending", "processing"];

export async function GET() {
  const userId = await requireUserId();
  const items = await db
    .select({
      id: wardrobeItems.id,
      status: wardrobeItems.analysisStatus,
      updatedAt: wardrobeItems.updatedAt,
    })
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.userId, userId),
        inArray(wardrobeItems.analysisStatus, inProgressStatuses),
      ),
    );
  return NextResponse.json({ items });
}
