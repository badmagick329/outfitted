import { NextResponse } from "next/server";
import { updateAccessModeSchema } from "@/features/access/contracts";
import { requireAdminUser } from "@/features/access/server";
import { setAccessMode } from "@/features/access/settings";
import { routeError } from "@/shared/route-response";

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const { accessMode } = updateAccessModeSchema.parse(await request.json());
    await setAccessMode(accessMode);
    return NextResponse.json({ ok: true, accessMode });
  } catch (error) {
    return routeError(error);
  }
}
