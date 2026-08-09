import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { saveOutfitSchema } from "@/features/outfits/domain/contracts";
import { outfitService } from "@/features/outfits/server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    const saved = await outfitService.save(
      (await requireAiUser()).userId,
      saveOutfitSchema.parse(await request.json()),
    );
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
