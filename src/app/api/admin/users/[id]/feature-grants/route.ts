import { NextResponse } from "next/server";
import { z } from "zod";
import {
  featureKeySchema,
  grantFeatureUse,
  revokeFeatureGrant,
} from "@/features/feature-grants/server";
import { requireAdminUser } from "@/features/access/server";
import { routeError } from "@/shared/route-response";

const featureGrantActionSchema = z
  .object({ featureKey: featureKeySchema, action: z.enum(["grant", "revoke"]) })
  .strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = featureGrantActionSchema.parse(await request.json());
    if (input.action === "grant") await grantFeatureUse(admin.userId, id, input.featureKey);
    else await revokeFeatureGrant(id, input.featureKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
