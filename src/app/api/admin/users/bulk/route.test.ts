import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden } from "@/shared/application-error";
const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn(), bulkUpdateManagedUsers: vi.fn() }));
vi.mock("@/features/access/server", () => mocks);
import { PATCH } from "./route";

describe("bulk access API boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ userId: "admin" });
  });
  it("authorizes before reading an untrusted body", async () => {
    mocks.requireAdminUser.mockRejectedValue(forbidden("Administrator access is required."));
    const request = new Request("http://localhost/api/admin/users/bulk", {
      method: "PATCH",
      body: "{",
    });
    const parse = vi.spyOn(request, "json");
    expect((await PATCH(request)).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.bulkUpdateManagedUsers).not.toHaveBeenCalled();
  });
  it("returns400 for malformed JSON without making partial writes", async () => {
    expect(
      (
        await PATCH(
          new Request("http://localhost/api/admin/users/bulk", { method: "PATCH", body: "{" }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.bulkUpdateManagedUsers).not.toHaveBeenCalled();
  });
});
