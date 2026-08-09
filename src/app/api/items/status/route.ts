import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

export async function GET() {
  try {
    return NextResponse.json({
      items: await wardrobeService.listInProgress((await requireActiveUser()).userId),
    });
  } catch (error) {
    return routeError(error);
  }
}
