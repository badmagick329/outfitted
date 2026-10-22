import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden, unauthorized, ApplicationError } from "@/shared/application-error";
const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn(), create: vi.fn() }));
vi.mock("@/features/access/server", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/features/ai-usage/report-selection-server", () => ({
  createAiUsageReportSelection: mocks.create,
}));
import { POST } from "./route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdminUser.mockResolvedValue({ userId: "admin" });
});
describe("report selection API", () => {
  it.each([unauthorized(), forbidden()])(
    "rejects unauthorized writes before parsing external data",
    async (error) => {
      mocks.requireAdminUser.mockRejectedValue(error);
      const request = new Request("http://localhost/api/admin/ai-usage/selections", {
        method: "POST",
        body: "{",
      });
      const parse = vi.spyOn(request, "json");
      expect((await POST(request)).status).toBe(error.status);
      expect(parse).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it("reports invalid JSON as400 without saving", async () => {
    expect(
      (
        await POST(
          new Request("http://localhost/api/admin/ai-usage/selections", {
            method: "POST",
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns the created token and preserves validation errors", async () => {
    const body = { memberIds: ["one", "two"] };
    const request = () =>
      new Request("http://localhost/api/admin/ai-usage/selections", {
        method: "POST",
        body: JSON.stringify(body),
      });
    mocks.create.mockResolvedValue({ selectionId: "dfb80000-0000-4000-8000-000000000001" });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ selectionId: "dfb80000-0000-4000-8000-000000000001" });
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(body);
    mocks.create.mockRejectedValue(new ApplicationError("VALIDATION_ERROR", 400, "Unknown member"));
    expect((await POST(request())).status).toBe(400);
  });
});
