export type AnalysisStatusItem = { id: string; status: string; updatedAt: string };

export function analysisStatusSnapshot(items: AnalysisStatusItem[]) {
  return items
    .map((item) => `${item.id}:${item.status}:${item.updatedAt}`)
    .sort()
    .join("|");
}

export function reconcileTrackedAnalyses(
  trackedItemIds: Iterable<string>,
  activeItems: AnalysisStatusItem[],
) {
  const activeItemIds = new Set(activeItems.map((item) => item.id));
  return {
    completedItemIds: [...trackedItemIds].filter((itemId) => !activeItemIds.has(itemId)),
    trackedItemIds: activeItemIds,
  };
}
