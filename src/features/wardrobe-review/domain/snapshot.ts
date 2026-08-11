import { createHash } from "node:crypto";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type { WardrobeReviewSourceItem } from "./contracts";

export function wardrobeReviewSnapshotSignature(
  items: WardrobeReviewSourceItem[],
  styleProfile: StyleProfile | null,
) {
  const source = {
    items: items
      .map((item) => ({ id: item.id, updatedAt: item.updatedAt.toISOString() }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    styleProfile,
  };
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

export function referencedReviewItemIds(report: {
  strengths: Array<{ itemIds: string[] }>;
  gaps: Array<{ itemIds: string[] }>;
  observations: Array<{ itemIds: string[] }>;
}) {
  return [
    ...new Set(
      [...report.strengths, ...report.gaps, ...report.observations].flatMap(
        (entry) => entry.itemIds,
      ),
    ),
  ];
}
