import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden, notFound, unauthorized } from "@/shared/application-error";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getDefaultAiBudget: vi.fn(),
  setDefaultAiBudget: vi.fn(),
  setMemberAiBudgetOverride: vi.fn(),
}));
vi.mock("@/features/access/server", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/features/ai-budget/server", () => ({
  getDefaultAiBudget: mocks.getDefaultAiBudget,
  setDefaultAiBudget: mocks.setDefaultAiBudget,
  setMemberAiBudgetOverride: mocks.setMemberAiBudgetOverride,
}));

import { GET, PATCH } from "./route";

function request(input: unknown) {
  return new Request("http://localhost/api/admin/ai-budgets", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

describe("admin budget API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ userId: "admin" });
    mocks.getDefaultAiBudget.mockResolvedValue(5_000_000);
  });

  it.each([unauthorized(), forbidden("Administrator access is required.")])(
    "rejects direct reads and writes without admin authorization",
    async (error) => {
      mocks.requireAdminUser.mockRejectedValue(error);
      const body = request({ action: "default", amountMicrousd: 0 });
      const parse = vi.spyOn(body, "json");
      expect((await GET()).status).toBe(error.status);
      expect((await PATCH(body)).status).toBe(error.status);
      expect(parse).not.toHaveBeenCalled();
      expect(mocks.getDefaultAiBudget).not.toHaveBeenCalled();
      expect(mocks.setDefaultAiBudget).not.toHaveBeenCalled();
      expect(mocks.setMemberAiBudgetOverride).not.toHaveBeenCalled();
    },
  );

  it("reads the stored default", async () => {
    expect(await (await GET()).json()).toEqual({ defaultLimitMicrousd: 5_000_000 });
  });

  it("returns a validation error for malformed JSON without changing configuration", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/ai-budgets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(mocks.setDefaultAiBudget).not.toHaveBeenCalled();
    expect(mocks.setMemberAiBudgetOverride).not.toHaveBeenCalled();
  });

  it.each([-1, 0.01, "5", null, 2_147_483_648])(
    "rejects invalid default amount %s before writing",
    async (amountMicrousd) => {
      const response = await PATCH(request({ action: "default", amountMicrousd }));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
      expect(mocks.setDefaultAiBudget).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 0.01, "5", 2_147_483_648])(
    "rejects invalid override amount %s before writing",
    async (amountMicrousd) => {
      expect(
        (await PATCH(request({ action: "override", userIds: ["one"], amountMicrousd }))).status,
      ).toBe(400);
      expect(mocks.setMemberAiBudgetOverride).not.toHaveBeenCalled();
    },
  );

  it.each([[], ["same", "same"], [""], Array.from({ length: 1001 }, (_, index) => `id-${index}`)])(
    "rejects invalid target selections before partial writes",
    async (userIds) => {
      expect(
        (await PATCH(request({ action: "override", userIds, amountMicrousd: 0 }))).status,
      ).toBe(400);
      expect(mocks.setMemberAiBudgetOverride).not.toHaveBeenCalled();
    },
  );

  it("allows a zero default without treating it as a missing amount", async () => {
    expect((await PATCH(request({ action: "default", amountMicrousd: 0 }))).status).toBe(200);
    expect(mocks.setDefaultAiBudget).toHaveBeenCalledExactlyOnceWith("admin", 0);
  });

  it("changes exactly the requested members and reports individual failures", async () => {
    mocks.setMemberAiBudgetOverride.mockImplementation(async (_actor, userId) => {
      if (userId === "missing") throw notFound("Member not found.");
    });
    const response = await PATCH(
      request({
        action: "override",
        userIds: ["one", "missing", "two"],
        amountMicrousd: 1_000_000,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.setMemberAiBudgetOverride.mock.calls).toEqual([
      ["admin", "one", 1_000_000],
      ["admin", "missing", 1_000_000],
      ["admin", "two", 1_000_000],
    ]);
    expect(await response.json()).toEqual({
      results: [
        { userId: "one", ok: true },
        { userId: "missing", ok: false, error: "Member not found." },
        { userId: "two", ok: true },
      ],
    });
  });

  it("removes only explicitly selected overrides through null", async () => {
    const response = await PATCH(
      request({ action: "override", userIds: ["two", "one"], amountMicrousd: null }),
    );
    expect(response.status).toBe(200);
    expect(mocks.setMemberAiBudgetOverride.mock.calls).toEqual([
      ["admin", "two", null],
      ["admin", "one", null],
    ]);
    expect(mocks.setDefaultAiBudget).not.toHaveBeenCalled();
  });

  it("requires explicit exact targets and rejects extra write properties", async () => {
    for (const input of [
      { action: "override", amountMicrousd: 0 },
      { action: "override", userIds: ["one"], amountMicrousd: 0, all: true },
      { action: "default", amountMicrousd: 0, userIds: ["one"] },
    ])
      expect((await PATCH(request(input))).status).toBe(400);
    expect(mocks.setDefaultAiBudget).not.toHaveBeenCalled();
    expect(mocks.setMemberAiBudgetOverride).not.toHaveBeenCalled();
  });
});
