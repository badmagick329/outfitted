export function canonicalOutfitItemIds(itemIds: string[]) {
  return [...new Set(itemIds)].sort();
}

export function outfitSignature(itemIds: string[]) {
  return canonicalOutfitItemIds(itemIds).join(":");
}

export function matchesOutfit(itemIds: string[], otherItemIds: string[]) {
  return outfitSignature(itemIds) === outfitSignature(otherItemIds);
}
