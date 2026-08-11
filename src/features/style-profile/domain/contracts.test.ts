import { describe, expect, it } from "vitest";
import { emptyStyleProfile, hasStyleProfileContent, styleProfileInputSchema } from "./contracts";

describe("style profile", () => {
  it("trims optional notes", () => {
    expect(
      styleProfileInputSchema.parse({
        ...emptyStyleProfile,
        generalStyle: "  Relaxed tailoring  ",
      }).generalStyle,
    ).toBe("Relaxed tailoring");
  });

  it("recognises an entirely empty profile", () => {
    expect(hasStyleProfileContent(emptyStyleProfile)).toBe(false);
    expect(hasStyleProfileContent({ ...emptyStyleProfile, avoidances: "No scratchy wool" })).toBe(
      true,
    );
  });
});
