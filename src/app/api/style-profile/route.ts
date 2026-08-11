import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { styleProfileInputSchema } from "@/features/style-profile/domain/contracts";
import { saveStyleProfile } from "@/features/style-profile/server";
import { routeError } from "@/shared/route-response";

export async function PUT(request: Request) {
  try {
    const access = await requireAiUser();
    const profile = await saveStyleProfile(
      access.userId,
      styleProfileInputSchema.parse(await request.json()),
    );
    return NextResponse.json({ profile });
  } catch (error) {
    return routeError(error);
  }
}
