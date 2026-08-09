import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { wardrobeItemIdSchema } from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export async function GET(_request: Request, context: RouteContext<"/api/photos/[id]">) {
  try {
    const { id } = await context.params;
    const image = await wardrobeService.readOwnedPhoto(
      await requireUserId(),
      wardrobeItemIdSchema.parse(id),
    );
    return new NextResponse(new Uint8Array(image), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" },
    });
  } catch (error) {
    return routeError(error);
  }
}
