function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function replaceOutfitRecommendationItem(
  content: string,
  currentItemId: string,
  replacementItemId: string,
  replacementLabel: string,
) {
  return content.replace(
    new RegExp(`\\[[^\\]]+\\]\\(item:${escapeRegExp(currentItemId)}\\)`, "g"),
    `[${markdownLabel(replacementLabel)}](item:${replacementItemId})`,
  );
}
