import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { wardrobeReviewService } from "@/features/wardrobe-review/server";
import { routeError } from "@/shared/route-response";

export async function GET() {
  try {
    return NextResponse.json(await wardrobeReviewService.getView((await requireAiUser()).userId));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST() {
  try {
    return NextResponse.json(await wardrobeReviewService.request((await requireAiUser()).userId), {
      status: 201,
    });
  } catch (error) {
    return routeError(error);
  }
}
