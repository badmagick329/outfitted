import { describe, expect, it } from "vitest";
import { resolveAccountAccess } from "./policy";

describe("resolveAccountAccess", () => {
  const admins = new Set(["admin@example.com"]);

  it("keeps ordinary new accounts pending and inventory-only", () => {
    expect(
      resolveAccountAccess(
        { email: "friend@example.com", accessStatus: "pending", featureTier: "inventory" },
        admins,
      ),
    ).toMatchObject({ accessStatus: "pending", canUseAi: false, isAdmin: false });
  });

  it("distinguishes active AI and disabled accounts", () => {
    expect(
      resolveAccountAccess(
        { email: "ai@example.com", accessStatus: "active", featureTier: "ai" },
        admins,
      ),
    ).toMatchObject({ accessStatus: "active", canUseAi: true });
    expect(
      resolveAccountAccess(
        { email: "disabled@example.com", accessStatus: "disabled", featureTier: "ai" },
        admins,
      ),
    ).toMatchObject({ accessStatus: "disabled", canUseAi: true });
  });

  it("grants normalized environment administrators active AI access", () => {
    expect(
      resolveAccountAccess(
        { email: " Admin@Example.com ", accessStatus: "disabled", featureTier: "inventory" },
        admins,
      ),
    ).toMatchObject({ accessStatus: "active", canUseAi: true, isAdmin: true });
  });
});
