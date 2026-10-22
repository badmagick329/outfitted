import { describe, expect, it, vi } from "vitest";
import { bulkUserAccessSchema } from "../contracts";
import { applyBulkAccess } from "./bulk-access";

describe("bulk member changes", () => {
  it("updates exactly the captured IDs and reports partial errors", async () => {
    const update = vi.fn(async (id: string) => {
      if (id === "admin") throw new Error("Administrators must keep AI access.");
    });
    expect(
      await applyBulkAccess(
        { userIds: ["outside-page", "admin", "last"], featureTier: "inventory" },
        update,
      ),
    ).toEqual([
      { userId: "outside-page", ok: true },
      { userId: "admin", ok: false, error: "Administrators must keep AI access." },
      { userId: "last", ok: true },
    ]);
    expect(update.mock.calls).toEqual([
      ["outside-page", { featureTier: "inventory" }],
      ["admin", { featureTier: "inventory" }],
      ["last", { featureTier: "inventory" }],
    ]);
  });

  it("rejects ambiguous, empty, duplicate and invalid bulk inputs", () => {
    for (const value of [
      { userIds: [], featureTier: "ai" },
      { userIds: ["a", "a"], featureTier: "ai" },
      { userIds: ["a"] },
      { userIds: ["a"], accessStatus: "other" },
      { userIds: ["a"], featureTier: "ai", all: true },
    ])
      expect(bulkUserAccessSchema.safeParse(value).success).toBe(false);
  });
});
