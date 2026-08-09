import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { saveOutfitSchema } from "@/features/outfits/domain/contracts";
import { outfitService } from "@/features/outfits/server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    const saved = await outfitService.save(
      await requireUserId(),
      saveOutfitSchema.parse(await request.json()),
    );
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
