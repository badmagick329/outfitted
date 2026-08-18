import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import { uploadPhotosSchema, wardrobeItemIdSchema } from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/items/[id]/photos">) {
  try {
    const { id } = await context.params;
    const files = uploadPhotosSchema.parse(
      (await request.formData())
        .getAll("photos")
        .filter((value): value is File => value instanceof File),
    );
    const photos = await wardrobeService.addPhotos(
      (await requireActiveUser()).userId,
      wardrobeItemIdSchema.parse(id),
      files,
    );
    return NextResponse.json({ photos }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
