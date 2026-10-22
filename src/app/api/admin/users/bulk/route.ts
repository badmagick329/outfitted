import { NextResponse } from "next/server";
import { bulkUpdateManagedUsers, requireAdminUser } from "@/features/access/server";
import { routeError } from "@/shared/route-response";

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    return NextResponse.json({ results: await bulkUpdateManagedUsers(await request.json()) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Submit a valid JSON body." } },
        { status: 400 },
      );
    }
    return routeError(error);
  }
}
