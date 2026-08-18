import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import {
  photoActionSchema,
  replacePhotoSchema,
  wardrobeItemIdSchema,
} from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export async function GET(request: Request, context: RouteContext<"/api/photos/[id]">) {
  try {
    const { id } = await context.params;
    const variant = new URL(request.url).searchParams.get("variant");
    const image = await wardrobeService.readOwnedPhoto(
      (await requireActiveUser()).userId,
      wardrobeItemIdSchema.parse(id),
      variant === "thumbnail" ? "thumbnail" : "display",
    );
    return new NextResponse(new Uint8Array(image), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" },
    });
  } catch (error) {
    return routeError(error);
  }
}

export const runtime = "nodejs";

export async function PUT(request: Request, context: RouteContext<"/api/photos/[id]">) {
  try {
    const { id } = await context.params;
    const files = replacePhotoSchema.parse(
      (await request.formData())
        .getAll("photo")
        .filter((value): value is File => value instanceof File),
    );
    const photos = await wardrobeService.replacePhoto(
      (await requireActiveUser()).userId,
      wardrobeItemIdSchema.parse(id),
      files[0],
    );
    return NextResponse.json({ photos });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/photos/[id]">) {
  try {
    const { id } = await context.params;
    const userId = (await requireActiveUser()).userId;
    const photoId = wardrobeItemIdSchema.parse(id);
    const action = photoActionSchema.parse(await request.json());
    const photos =
      action.action === "set-cover"
        ? await wardrobeService.setMainPhoto(userId, photoId)
        : await wardrobeService.rotatePhoto(userId, photoId, action.direction);
    return NextResponse.json({ photos });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/photos/[id]">) {
  try {
    const { id } = await context.params;
    await wardrobeService.removePhoto(
      (await requireActiveUser()).userId,
      wardrobeItemIdSchema.parse(id),
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
