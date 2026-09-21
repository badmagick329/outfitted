import { NextResponse } from "next/server";
import { requireActiveUser } from "@/features/access/server";
import { submitAiAccessRequestSchema } from "@/features/ai-access/domain/contracts";
import { aiAccessService } from "@/features/ai-access/server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    const access = await requireActiveUser();
    submitAiAccessRequestSchema.parse(await request.json());
    const created = await aiAccessService.submit(access.userId);
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
