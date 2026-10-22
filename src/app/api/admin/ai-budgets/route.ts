import { NextResponse } from "next/server";
import { requireAdminUser } from "@/features/access/server";
import {
  getDefaultAiBudget,
  setDefaultAiBudget,
  setMemberAiBudgetOverride,
} from "@/features/ai-budget/server";
import { adminBudgetRequestSchema } from "@/features/ai-budget/presentation/admin-budget-request";
import { routeError } from "@/shared/route-response";

export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json({ defaultLimitMicrousd: await getDefaultAiBudget() });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must contain valid JSON." } },
        { status: 400 },
      );
    }
    const input = adminBudgetRequestSchema.parse(body);
    if (input.action === "default") {
      await setDefaultAiBudget(admin.userId, input.amountMicrousd);
      return NextResponse.json({ ok: true });
    }
    const results = [];
    for (const userId of input.userIds) {
      try {
        await setMemberAiBudgetOverride(admin.userId, userId, input.amountMicrousd);
        results.push({ userId, ok: true });
      } catch (error) {
        results.push({
          userId,
          ok: false,
          error: error instanceof Error ? error.message : "Budget update failed.",
        });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    return routeError(error);
  }
}
