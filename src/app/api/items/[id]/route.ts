import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  updateWardrobeItemSchema,
  wardrobeItemIdSchema,
} from "@/features/wardrobe/domain/contracts";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export async function PATCH(request: Request, context: RouteContext<"/api/items/[id]">) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    await wardrobeService.update(
      userId,
      wardrobeItemIdSchema.parse(id),
      updateWardrobeItemSchema.parse(await request.json()),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/items/[id]">) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    await wardrobeService.delete(userId, wardrobeItemIdSchema.parse(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(_request: Request, context: RouteContext<"/api/items/[id]">) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    await wardrobeService.requestAnalysis(userId, wardrobeItemIdSchema.parse(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
