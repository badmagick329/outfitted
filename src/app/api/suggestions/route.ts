import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createOutfitSuggestionSchema } from "@/features/outfits/domain/contracts";
import { outfitService } from "@/features/outfits/server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    const suggestion = await outfitService.create(
      await requireUserId(),
      createOutfitSuggestionSchema.parse(await request.json()),
    );
    return NextResponse.json(suggestion, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
