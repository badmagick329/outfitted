import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { savedOutfitIdSchema } from "@/features/outfits/domain/contracts";
import { outfitService } from "@/features/outfits/server";
import { routeError } from "@/shared/route-response";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await outfitService.removeSaved((await requireAiUser()).userId, savedOutfitIdSchema.parse(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
