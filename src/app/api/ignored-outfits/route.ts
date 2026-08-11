import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { ignoreOutfitSchema } from "@/features/outfits/domain/contracts";
import { outfitService } from "@/features/outfits/server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    await outfitService.ignore(
      (await requireAiUser()).userId,
      ignoreOutfitSchema.parse(await request.json()),
    );
    return NextResponse.json({ ignored: true }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
