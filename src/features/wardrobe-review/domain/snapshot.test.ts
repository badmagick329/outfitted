import { describe, expect, it } from "vitest";
import { referencedReviewItemIds, wardrobeReviewSnapshotSignature } from "./snapshot";
import type { WardrobeReviewSourceItem } from "./contracts";

const item = {
  id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d",
  name: "Teal shirt",
  description: null,
  category: "shirt",
  categoryGroup: "tops",
  primaryColor: "teal",
  secondaryColors: [],
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: null,
  analysisStatus: "complete",
  updatedAt: new Date("2026-08-11T10:00:00Z"),
  coverPhotoId: null,
} satisfies WardrobeReviewSourceItem;

describe("wardrobe review snapshot", () => {
  it("is stable across wardrobe ordering and changes with edited items", () => {
    const second = { ...item, id: "8b30a7fa-b808-4e1e-a125-9238b134f61d" };
    expect(wardrobeReviewSnapshotSignature([item, second], null)).toBe(
      wardrobeReviewSnapshotSignature([second, item], null),
    );
    expect(wardrobeReviewSnapshotSignature([item], null)).not.toBe(
      wardrobeReviewSnapshotSignature(
        [{ ...item, updatedAt: new Date("2026-08-11T11:00:00Z") }],
        null,
      ),
    );
  });

  it("collects referenced garments once in report order", () => {
    expect(
      referencedReviewItemIds({
        strengths: [{ itemIds: [item.id] }],
        gaps: [{ itemIds: [item.id, "8b30a7fa-b808-4e1e-a125-9238b134f61d"] }],
        observations: [],
      }),
    ).toEqual([item.id, "8b30a7fa-b808-4e1e-a125-9238b134f61d"]);
  });
});
