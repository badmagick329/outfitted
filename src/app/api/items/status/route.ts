import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export async function GET() {
  try {
    return NextResponse.json({
      items: await wardrobeService.listInProgress(await requireUserId()),
    });
  } catch (error) {
    return routeError(error);
  }
}
