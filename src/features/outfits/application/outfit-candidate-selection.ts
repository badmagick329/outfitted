import type { CategoryGroup } from "@/features/wardrobe/domain/category-groups";
import type { OutfitSuggestionCandidate } from "@/lib/ai";
import { outfitSignature } from "../domain/outfit-signature";

export type RecentSuggestionUsage = {
  recentSuggestionCount: number;
  lastSuggestedPosition: number | null;
};
export type ValidOutfitCandidate = OutfitSuggestionCandidate & { signature: string };
export type OutfitNovelty = {
  immediateOverlapRatio: number;
  lastThreeUsageAverage: number;
  highestRecentUseCount: number;
  overallRecentUseAverage: number;
};
export type OutfitSelectionDiagnosticsV1 = {
  version: 1;
  requestMode: "initial" | "another";
  selectedStartingItemId?: string;
  attemptCount: number;
  generatedCandidateCount: number;
  validCandidateCount: number;
  selectedSuitabilityTier: "A" | "B" | "C";
  qualityPoolSize: number;
  eligibleItemCountByRole: Record<string, number>;
  qualityPool: Array<{ itemIds: string[]; itemsByRole: Record<string, string[]> }>;
  variableRoles: string[];
  selectedNovelty: OutfitNovelty;
};

export function recentSuggestionUsageByItemId(history: string[][]) {
  const usageByItemId = new Map<string, RecentSuggestionUsage>();
  for (const [position, itemIds] of history.entries()) {
    for (const itemId of new Set(itemIds)) {
      const usage = usageByItemId.get(itemId);
      if (usage) usage.recentSuggestionCount += 1;
      else usageByItemId.set(itemId, { recentSuggestionCount: 1, lastSuggestedPosition: position });
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

export function qualityGateCandidates(candidates: ValidOutfitCandidate[]) {
  const selectedSuitabilityTier = (["A", "B", "C"] as const).find((tier) =>
    candidates.some((candidate) => candidate.suitabilityTier === tier),
  );
  return {
    selectedSuitabilityTier,
    candidates: selectedSuitabilityTier
      ? candidates.filter((candidate) => candidate.suitabilityTier === selectedSuitabilityTier)
      : [],
  };
}

function lastThreeUsageByItemId(history: string[][]) {
  const usageByItemId = new Map<string, number>();
  for (const itemIds of history.slice(0, 3))
    for (const itemId of new Set(itemIds))
      usageByItemId.set(itemId, (usageByItemId.get(itemId) ?? 0) + 1);
  return usageByItemId;
}

function compareNovelty(left: OutfitNovelty, right: OutfitNovelty) {
  for (const key of [
    "immediateOverlapRatio",
    "lastThreeUsageAverage",
    "highestRecentUseCount",
    "overallRecentUseAverage",
  ] as const)
    if (left[key] !== right[key]) return left[key] - right[key];
  return 0;
}

export function itemsByRole(
  candidate: Pick<OutfitSuggestionCandidate, "referencedItemIds">,
  itemRoleById: ReadonlyMap<string, CategoryGroup>,
) {
  const byRole: Record<string, string[]> = {};
  for (const itemId of candidate.referencedItemIds)
    (byRole[itemRoleById.get(itemId) ?? "other"] ??= []).push(itemId);
  for (const itemIds of Object.values(byRole)) itemIds.sort();
  return byRole;
}

export function variableRoles(
  candidates: ValidOutfitCandidate[],
  itemRoleById: ReadonlyMap<string, CategoryGroup>,
) {
  const roles = new Set<string>(itemRoleById.values());
  for (const candidate of candidates)
    for (const role of Object.keys(itemsByRole(candidate, itemRoleById))) roles.add(role);
  return [...roles].filter(
    (role) =>
      new Set(
        candidates.map((candidate) => (itemsByRole(candidate, itemRoleById)[role] ?? []).join(":")),
      ).size > 1,
  );
}

export function candidateNovelty(
  candidate: Pick<OutfitSuggestionCandidate, "referencedItemIds">,
  history: string[][],
  recentUsageByItemId: ReadonlyMap<string, RecentSuggestionUsage>,
  options: {
    selectedItemId?: string;
    scoredItemIds?: ReadonlySet<string>;
    previousItemIds?: string[];
  } = {},
): OutfitNovelty {
  const scoredItemIds = candidate.referencedItemIds.filter(
    (itemId) =>
      itemId !== options.selectedItemId &&
      (!options.scoredItemIds || options.scoredItemIds.has(itemId)),
  );
  if (!scoredItemIds.length)
    return {
      immediateOverlapRatio: 0,
      lastThreeUsageAverage: 0,
      highestRecentUseCount: 0,
      overallRecentUseAverage: 0,
    };
  const previousItemIds = new Set(options.previousItemIds ?? history[0] ?? []);
  const lastThreeUsage = lastThreeUsageByItemId(history);
  const count = scoredItemIds.length;
  const recentCounts = scoredItemIds.map(
    (itemId) => recentUsageByItemId.get(itemId)?.recentSuggestionCount ?? 0,
  );
  return {
    immediateOverlapRatio:
      scoredItemIds.filter((itemId) => previousItemIds.has(itemId)).length / count,
    lastThreeUsageAverage:
      scoredItemIds.reduce((total, itemId) => total + (lastThreeUsage.get(itemId) ?? 0), 0) / count,
    highestRecentUseCount: Math.max(...recentCounts),
    overallRecentUseAverage: recentCounts.reduce((total, value) => total + value, 0) / count,
  };
}

export function selectCandidateWithDiagnostics(
  candidates: ValidOutfitCandidate[],
  history: string[][],
  options: {
    selectedItemId?: string;
    previousItemIds?: string[];
    itemRoleById?: ReadonlyMap<string, CategoryGroup>;
    random?: () => number;
  } = {},
) {
  const itemRoleById = options.itemRoleById ?? new Map<string, CategoryGroup>();
  const roles = variableRoles(candidates, itemRoleById);
  const scoredItemIds = new Set(
    candidates.flatMap((candidate) =>
      candidate.referencedItemIds.filter((itemId) =>
        roles.includes(itemRoleById.get(itemId) ?? "other"),
      ),
    ),
  );
  const recentUsageByItemId = recentSuggestionUsageByItemId(history);
  const scored = candidates.map((candidate) => ({
    candidate,
    novelty: candidateNovelty(candidate, history, recentUsageByItemId, {
      selectedItemId: options.selectedItemId,
      scoredItemIds,
      previousItemIds: options.previousItemIds,
    }),
  }));
  const bestNovelty = scored.reduce<OutfitNovelty | null>(
    (best, entry) => (!best || compareNovelty(entry.novelty, best) < 0 ? entry.novelty : best),
    null,
  );
  const bestCandidates = scored.filter(
    (entry) => compareNovelty(entry.novelty, bestNovelty ?? entry.novelty) === 0,
  );
  const selected =
    bestCandidates.length === 1
      ? bestCandidates[0]!
      : bestCandidates[Math.floor((options.random ?? Math.random)() * bestCandidates.length)]!;
  return { candidate: selected.candidate, novelty: selected.novelty, variableRoles: roles };
}

export function selectLeastRepetitiveCandidate(
  candidates: ValidOutfitCandidate[],
  history: string[][],
  selectedItemId?: string,
  random = Math.random,
) {
  return selectCandidateWithDiagnostics(candidates, history, { selectedItemId, random }).candidate;
}
