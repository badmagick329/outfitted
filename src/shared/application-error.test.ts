import { describe, expect, it } from "vitest";
import { aiBudgetExhausted } from "./application-error";

describe("member AI budget feedback", () => {
  it.each([
    ["2026-11-01T00:00:00Z", "1 November 2026"],
    ["2026-06-30T23:00:00Z", "1 July 2026"],
  ])("shows the UK reset date and midnight across GMT/BST for %s", (instant, date) => {
    const error = aiBudgetExhausted(new Date(instant));
    expect(error).toMatchObject({
      code: "AI_BUDGET_EXHAUSTED",
      status: 429,
      resetAt: new Date(instant).toISOString(),
    });
    expect(error.message).toContain(`00:00 Europe/London on ${date}`);
    expect(error.message).toContain("still browse and edit your wardrobe");
  });

  it("distinguishes budget held for running or uncertain requests from spent funds", () => {
    const reset = new Date("2026-11-01T00:00:00Z");
    expect(aiBudgetExhausted(reset, 100).message).toContain(
      "held for AI requests still running or awaiting confirmation",
    );
    expect(aiBudgetExhausted(reset, 0).message).not.toContain("held");
  });
});
