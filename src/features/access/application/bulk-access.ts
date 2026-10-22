import type { AccessStatus, FeatureTier } from "../contracts";

export type BulkAccessChange = {
  userIds: string[];
  accessStatus?: AccessStatus;
  featureTier?: FeatureTier;
};

export type BulkResult = { userId: string; ok: boolean; error?: string };

// Resolve each explicit ID independently: one stale/deleted/protected account must
// not hide successful changes to the other targets, or widen the target set.
export async function applyBulkAccess(
  input: BulkAccessChange,
  update: (userId: string, change: Omit<BulkAccessChange, "userIds">) => Promise<void>,
): Promise<BulkResult[]> {
  const { userIds, ...change } = input;
  const results: BulkResult[] = [];
  for (const userId of userIds) {
    try {
      await update(userId, change);
      results.push({ userId, ok: true });
    } catch (error) {
      results.push({
        userId,
        ok: false,
        error: error instanceof Error ? error.message : "Update failed.",
      });
    }
  }
  return results;
}
