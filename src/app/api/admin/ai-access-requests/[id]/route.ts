import { NextResponse } from "next/server";
import { requireAdminUser } from "@/features/access/server";
import { resolveAiAccessRequestSchema } from "@/features/ai-access/domain/contracts";
import { aiAccessService } from "@/features/ai-access/server";
import { routeError } from "@/shared/route-response";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/ai-access-requests/[id]">,
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const decision = resolveAiAccessRequestSchema.parse(await request.json());
    await aiAccessService.resolve(admin.userId, id, decision);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
