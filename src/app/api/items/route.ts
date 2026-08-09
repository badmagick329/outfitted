import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { uploadPhotosSchema } from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const formData = await request.formData();
    const files = uploadPhotosSchema.parse(
      formData.getAll("photos").filter((value): value is File => value instanceof File),
    );
    const item = await wardrobeService.create(userId, files);
    return NextResponse.json({ itemId: item.id }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
