import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeItemIdSchema } from "@/features/wardrobe/domain/contracts";
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
