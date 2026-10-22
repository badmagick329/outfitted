import { describe, expect, it } from "vitest";
import { aiUsageHref, parseAiUsageSelection } from "./report-selection";

describe("AI usage URL selection", () => {
  const ids = new Set(["one", "two", "three", "space & email"]);
  it("distinguishes everyone, an empty group, and invalid explicit IDs", () => {
    expect(parseAiUsageSelection(undefined, ids)).toEqual({ memberIds: null, invalid: false });
    expect(parseAiUsageSelection("", ids)).toEqual({ memberIds: [], invalid: false });
    for (const raw of ["unknown", ["one", "unknown"], ["one", ""], []])
      expect(parseAiUsageSelection(raw, ids)).toEqual({ memberIds: [], invalid: true });
  });
  it("deduplicates and sorts repeated IDs", () => {
    expect(parseAiUsageSelection(["two", "one", "two"], ids)).toEqual({
      memberIds: ["one", "two"],
      invalid: false,
    });
    expect(aiUsageHref(30, ["two", "one", "two"])).toBe(
      "/admin/ai-usage?range=30&memberId=one&memberId=two",
    );
  });
  it.each([7, 30, 90])(
    "round trips all, one, multiple and empty selection through the %i-day range",
    (range) => {
      for (const memberIds of [null, [], ["one"], ["one", "space & email", "two"]]) {
        const url = new URL(aiUsageHref(range, memberIds), "http://localhost");
        const raw = url.searchParams.has("memberId")
          ? url.searchParams.getAll("memberId")
          : undefined;
        expect(url.searchParams.get("range")).toBe(String(range));
        expect(parseAiUsageSelection(raw, ids)).toEqual({ memberIds, invalid: false });
      }
    },
  );
});
