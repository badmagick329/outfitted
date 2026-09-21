import { describe, expect, it } from "vitest";
import { asAccessMode, resolveAccountAccess, resolveEffectiveAccessStatus } from "./policy";

describe("resolveAccountAccess", () => {
  const admins = new Set(["admin@example.com"]);

  const account = (overrides: { email?: string; accessStatus?: string; featureTier?: string }) => ({
    email: "friend@example.com",
    accessStatus: "pending",
    featureTier: "inventory",
    ...overrides,
  });

  it("keeps ordinary new accounts pending and inventory-only in private mode", () => {
    expect(resolveAccountAccess(account({}), admins, "private")).toMatchObject({
      accessStatus: "pending",
      canUseAi: false,
      isAdmin: false,
    });
  });

  it("admits stored pending accounts in public mode without granting AI", () => {
    expect(resolveAccountAccess(account({}), admins, "public")).toMatchObject({
      accessStatus: "active",
      canUseAi: false,
      isAdmin: false,
    });
  });

  it("keeps disabled accounts blocked in both modes", () => {
    for (const accessMode of ["private", "public"] as const) {
      expect(
        resolveAccountAccess(account({ accessStatus: "disabled" }), admins, accessMode),
      ).toMatchObject({ accessStatus: "disabled", canUseAi: false });
    }
  });

  it("keeps manually active accounts active in both modes", () => {
    for (const accessMode of ["private", "public"] as const) {
      expect(
        resolveAccountAccess(account({ accessStatus: "active" }), admins, accessMode),
      ).toMatchObject({ accessStatus: "active", canUseAi: false });
    }
  });

  it("preserves an explicit AI tier for active accounts in both modes", () => {
    for (const accessMode of ["private", "public"] as const) {
      expect(
        resolveAccountAccess(
          account({ accessStatus: "active", featureTier: "ai" }),
          admins,
          accessMode,
        ),
      ).toMatchObject({ accessStatus: "active", canUseAi: true });
    }
  });

  it("distinguishes disabled AI accounts from active ones", () => {
    expect(
      resolveAccountAccess(
        account({ accessStatus: "disabled", featureTier: "ai" }),
        admins,
        "private",
      ),
    ).toMatchObject({ accessStatus: "disabled", canUseAi: true });
  });

  it("grants normalized environment administrators active AI access regardless of mode", () => {
    for (const accessMode of ["private", "public"] as const) {
      expect(
        resolveAccountAccess(
          account({
            email: " Admin@Example.com ",
            accessStatus: "disabled",
            featureTier: "inventory",
          }),
          admins,
          accessMode,
        ),
      ).toMatchObject({ accessStatus: "active", canUseAi: true, isAdmin: true });
    }
  });
});

describe("resolveEffectiveAccessStatus", () => {
  it("only promotes pending accounts when public", () => {
    expect(resolveEffectiveAccessStatus("pending", "public")).toBe("active");
    expect(resolveEffectiveAccessStatus("pending", "private")).toBe("pending");
    expect(resolveEffectiveAccessStatus("active", "private")).toBe("active");
    expect(resolveEffectiveAccessStatus("disabled", "public")).toBe("disabled");
  });
});

describe("asAccessMode", () => {
  it("fails closed to private for absent or unknown values", () => {
    expect(asAccessMode(undefined)).toBe("private");
    expect(asAccessMode(null)).toBe("private");
    expect(asAccessMode("")).toBe("private");
    expect(asAccessMode("private")).toBe("private");
    expect(asAccessMode("public")).toBe("public");
  });
});
