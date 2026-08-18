import { describe, expect, it } from "vitest";
import { featureKeySchema, getFeatureDefinition } from "./registry";

describe("feature grant registry", () => {
  it("defines the bulk wardrobe re-analysis grant", () => {
    expect(getFeatureDefinition("bulk_wardrobe_reanalysis")).toMatchObject({
      label: "Re-analyse entire wardrobe",
      grantType: "consumable",
      grantedUses: 1,
      requiresActiveAccount: true,
      requiresAiAccess: true,
    });
  });

  it("rejects unknown feature keys", () => {
    expect(() => featureKeySchema.parse("arbitrary_feature")).toThrow();
  });
});
