import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import { uploadPhotosSchema, wardrobeItemIdSchema } from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { readPhotoFormData } from "@/features/wardrobe/presentation/photo-request";
import { maxPhotosPerGarment } from "@/features/wardrobe/domain/photo-files";
import { routeError } from "@/shared/route-response";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/items/[id]/photos">) {
  try {
    const { id } = await context.params;
    const userId = (await requireActiveUser()).userId;
    const itemId = wardrobeItemIdSchema.parse(id);
    const files = uploadPhotosSchema.parse(
      (await readPhotoFormData(request, maxPhotosPerGarment))
        .getAll("photos")
        .filter((value): value is File => value instanceof File),
    );
    const photos = await wardrobeService.addPhotos(userId, itemId, files);
    return NextResponse.json({ photos }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
