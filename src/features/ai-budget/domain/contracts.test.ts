import { describe, expect, it } from "vitest";
import { budgetAmountSchema, budgetSnapshot, DEFAULT_AI_BUDGET_MICROUSD } from "./contracts";
import { aiBudgetPeriod } from "./period";

const base = {
  userId: "member",
  period: aiBudgetPeriod(new Date("2026-10-20Z")),
  defaultLimitMicrousd: DEFAULT_AI_BUDGET_MICROUSD,
  overrideLimitMicrousd: null,
  spentMicrousd: 1_000_000,
  reservedMicrousd: 500_000,
};

describe("budget policy", () => {
  it("inherits the default and deducts both spend and held funds", () => {
    expect(budgetSnapshot(base)).toMatchObject({
      limitMicrousd: 5_000_000,
      availableMicrousd: 3_500_000,
    });
  });
  it("distinguishes an explicit zero override from inheritance", () => {
    expect(budgetSnapshot({ ...base, overrideLimitMicrousd: 0 })).toMatchObject({
      limitMicrousd: 0,
      availableMicrousd: 0,
    });
  });
  it("preserves liabilities when the limit falls below spend", () => {
    expect(budgetSnapshot({ ...base, defaultLimitMicrousd: 100 })).toMatchObject({
      spentMicrousd: 1_000_000,
      reservedMicrousd: 500_000,
      availableMicrousd: 0,
    });
  });
  it.each([-1, 0.1, "5000000", null, undefined, Infinity, NaN, 2_147_483_648])(
    "rejects invalid persisted amounts %s",
    (amount) => {
      expect(budgetAmountSchema.safeParse(amount).success).toBe(false);
    },
  );
});
