import { NextResponse } from "next/server";
import { requireAiUser } from "@/features/access/server";
import { beginFeatureRun, completeFeatureRunItem } from "@/features/feature-grants/server";
import { wardrobeService } from "@/features/wardrobe/server";
import { routeError } from "@/shared/route-response";

const bulkReanalysisFeature = "bulk_wardrobe_reanalysis";

export async function POST() {
  try {
    const access = await requireAiUser();
    const availability = await wardrobeService.getBulkReanalysisAvailability(access.userId);
    if (availability.activeCount === 0)
      return NextResponse.json({
        queued: 0,
        skipped: 0,
        failed: 0,
        message: "No active garments to re-analyse.",
      });
    if (availability.eligibleCount === 0)
      return NextResponse.json({
        queued: 0,
        skipped: availability.activeCount,
        failed: 0,
        message: "All active garments are already being analysed.",
      });

    const items = await wardrobeService.listActive(access.userId);
    const runId = access.isAdmin
      ? undefined
      : await beginFeatureRun(
          access.userId,
          bulkReanalysisFeature,
          items.map((item) => item.id),
        );
    const result = await wardrobeService.queueBulkReanalysis(
      access.userId,
      runId
        ? {
            id: runId,
            itemIds: items.map((item) => item.id),
            completeItem: (itemId) => completeFeatureRunItem(runId, itemId),
          }
        : undefined,
    );
    return NextResponse.json({
      ...result,
      message:
        result.queued > 0
          ? `${result.queued} ${result.queued === 1 ? "garment" : "garments"} queued for re-analysis.`
          : "No garments were queued for re-analysis.",
    });
  } catch (error) {
    return routeError(error);
  }
}
