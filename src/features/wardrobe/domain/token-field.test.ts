import { describe, expect, it } from "vitest";
import {
  commitTokenDraft,
  removeToken,
  tokenFieldIsDirty,
  tokenFieldPresentation,
} from "./token-field";

describe("token field helpers", () => {
  it("commits comma-separated drafts without losing values", () => {
    expect(commitTokenDraft(["Casual"], "minimalist, Workwear")).toEqual([
      "Casual",
      "minimalist",
      "Workwear",
    ]);
  });

  it("deduplicates case-insensitively and reuses established display spelling", () => {
    expect(commitTokenDraft(["Casual"], " casual, minimalist ", ["Minimalist"])).toEqual([
      "Casual",
      "Minimalist",
    ]);
  });

  it("removes chips case-insensitively", () => {
    expect(removeToken(["Casual", "Minimalist"], "casual")).toEqual(["Minimalist"]);
  });

  it("treats a remaining draft as unsaved", () => {
    expect(tokenFieldIsDirty(["Casual"], ["Casual"], "new tag")).toBe(true);
    expect(tokenFieldIsDirty(["Casual"], ["Casual"], "")).toBe(false);
  });

  it("keeps empty secondary colours compact until the add input is opened", () => {
    expect(tokenFieldPresentation([], "", false)).toBe("compact");
    expect(tokenFieldPresentation([], "", true)).toBe("editing");
    expect(tokenFieldPresentation(["Navy"], "", false)).toBe("chips");
    expect(tokenFieldPresentation([], "navy", false)).toBe("editing");
  });
});
