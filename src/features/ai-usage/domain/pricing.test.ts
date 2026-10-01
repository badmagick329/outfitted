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
    ).toBe(1_345);
  });

  it("never creates negative uncached usage from inconsistent provider totals", () => {
    expect(
      estimateCostMicrousd({
        inputTokens: 100,
        cachedInputTokens: 80,
        cacheWriteInputTokens: 80,
        outputTokens: 0,
      }),
    ).toBe(11);
  });

  it("keeps standard rates for prompts at exactly 272K input tokens", () => {
    expect(
      estimateCostMicrousd({
        inputTokens: 272_000,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
        outputTokens: 1_000,
      }),
    ).toBe(27_700);
  });

  it("applies long-context rates to the whole request above 272K input tokens", () => {
    expect(
      estimateCostMicrousd({
        inputTokens: 300_000,
        cachedInputTokens: 100_000,
        cacheWriteInputTokens: 50_000,
        outputTokens: 2_000,
      }),
    ).toBe(46_000);
  });
});
