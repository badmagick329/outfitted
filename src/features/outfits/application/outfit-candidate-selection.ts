import type { OutfitSuggestionCandidate } from "@/lib/ai";
import { outfitSignature } from "../domain/outfit-signature";

export type RecentSuggestionUsage = {
  recentSuggestionCount: number;
  lastSuggestedPosition: number | null;
};

export type ValidOutfitCandidate = OutfitSuggestionCandidate & {
  signature: string;
};

type NoveltyTuple = [number, number, number, number];

export function recentSuggestionUsageByItemId(history: string[][]) {
  const usageByItemId = new Map<string, RecentSuggestionUsage>();
  for (const [position, itemIds] of history.entries()) {
    for (const itemId of new Set(itemIds)) {
      const usage = usageByItemId.get(itemId);
      if (usage) {
        usage.recentSuggestionCount += 1;
      } else {
        usageByItemId.set(itemId, { recentSuggestionCount: 1, lastSuggestedPosition: position });
      }
    }
  }
  return usageByItemId;
}

export function validOutfitCandidates(
  candidates: OutfitSuggestionCandidate[],
  allowedItemIds: ReadonlySet<string>,
  excludedSignatures: ReadonlySet<string>,
  selectedItemId?: string,
) {
  const valid: ValidOutfitCandidate[] = [];
  const seenSignatures = new Set<string>();
  for (const candidate of candidates) {
    const referencedItemIds = candidate.referencedItemIds.filter(
      (itemId, index) =>
        allowedItemIds.has(itemId) && candidate.referencedItemIds.indexOf(itemId) === index,
    );
    if (
      !referencedItemIds.length ||
      (selectedItemId && !referencedItemIds.includes(selectedItemId))
    )
      continue;
    const signature = outfitSignature(referencedItemIds);
    if (excludedSignatures.has(signature) || seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);
    valid.push({ ...candidate, referencedItemIds, signature });
  }
  return valid;
}

function lastThreeUsageByItemId(history: string[][]) {
  const usageByItemId = new Map<string, number>();
  for (const itemIds of history.slice(0, 3)) {
    for (const itemId of new Set(itemIds))
      usageByItemId.set(itemId, (usageByItemId.get(itemId) ?? 0) + 1);
  }
  return usageByItemId;
}

export function candidateNovelty(
  candidate: Pick<OutfitSuggestionCandidate, "referencedItemIds">,
  history: string[][],
  recentUsageByItemId: ReadonlyMap<string, RecentSuggestionUsage>,
  selectedItemId?: string,
): NoveltyTuple {
  const scoredItemIds = candidate.referencedItemIds.filter((itemId) => itemId !== selectedItemId);
  if (!scoredItemIds.length) return [0, 0, 0, 0];

  const previousItemIds = new Set(history[0] ?? []);
  const lastThreeUsage = lastThreeUsageByItemId(history);
  const count = scoredItemIds.length;
  const immediateOverlap =
    scoredItemIds.filter((itemId) => previousItemIds.has(itemId)).length / count;
  const lastThreeAverage =
    scoredItemIds.reduce((total, itemId) => total + (lastThreeUsage.get(itemId) ?? 0), 0) / count;
  const recentCounts = scoredItemIds.map(
    (itemId) => recentUsageByItemId.get(itemId)?.recentSuggestionCount ?? 0,
  );
  const highestRecentCount = Math.max(...recentCounts);
  const overallRecentAverage = recentCounts.reduce((total, value) => total + value, 0) / count;
  return [immediateOverlap, lastThreeAverage, highestRecentCount, overallRecentAverage];
}

function compareNovelty(left: NoveltyTuple, right: NoveltyTuple) {
  for (const [index, value] of left.entries()) {
    if (value !== right[index]) return value - right[index];
  }
  return 0;
}

export function selectLeastRepetitiveCandidate(
  candidates: ValidOutfitCandidate[],
  history: string[][],
  selectedItemId?: string,
  random = Math.random,
) {
  const recentUsageByItemId = recentSuggestionUsageByItemId(history);
  const scored = candidates.map((candidate) => ({
    candidate,
    novelty: candidateNovelty(candidate, history, recentUsageByItemId, selectedItemId),
  }));
  const bestNovelty = scored.reduce<NoveltyTuple | null>(
    (best, entry) => (!best || compareNovelty(entry.novelty, best) < 0 ? entry.novelty : best),
    null,
  );
  const bestCandidates = scored.filter(
    (entry) => compareNovelty(entry.novelty, bestNovelty ?? entry.novelty) === 0,
  );
  if (bestCandidates.length === 1) return bestCandidates[0].candidate;
  return bestCandidates[Math.floor(random() * bestCandidates.length)]!.candidate;
}
