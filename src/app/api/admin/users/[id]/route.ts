import { NextResponse } from "next/server";
import { updateUserAccessSchema } from "@/features/access/contracts";
import { requireAdminUser, updateManagedUser } from "@/features/access/server";
import { routeError } from "@/shared/route-response";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[id]">) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    await updateManagedUser(admin.userId, id, updateUserAccessSchema.parse(await request.json()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
