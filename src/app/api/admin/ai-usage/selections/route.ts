import { NextResponse } from "next/server";
import { requireAdminUser } from "@/features/access/server";
import { createAiUsageReportSelection } from "@/features/ai-usage/report-selection-server";
import { routeError } from "@/shared/route-response";

export async function POST(request: Request) {
  try {
    await requireAdminUser();
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
    return NextResponse.json(await createAiUsageReportSelection(body), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
