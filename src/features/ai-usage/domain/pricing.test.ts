import { describe, expect, it } from "vitest";
import { estimateCostMicrousd } from "./pricing";

describe("estimateCostMicrousd", () => {
  it("prices uncached, cached, cache-write and output tokens separately", () => {
    expect(
      estimateCostMicrousd({
        inputTokens: 10_000,
        cachedInputTokens: 2_000,
        cacheWriteInputTokens: 1_000,
        outputTokens: 1_000,
      }),
    ).toBe(2_890);
  });

  it("never creates negative uncached usage from inconsistent provider totals", () => {
    expect(
      estimateCostMicrousd({
        inputTokens: 100,
        cachedInputTokens: 80,
        cacheWriteInputTokens: 80,
        outputTokens: 0,
      }),
    ).toBe(22);
  });
});
