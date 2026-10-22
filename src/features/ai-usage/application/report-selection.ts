export type ReportMember = { id: string; name: string | null; email: string };

// Null alone means everyone. An explicit empty selection must stay empty in URLs and queries.
export type AiUsageSelection = readonly string[] | null;

export function parseAiUsageSelection(
  raw: string | string[] | undefined,
  knownIds: ReadonlySet<string>,
): { memberIds: AiUsageSelection; invalid: boolean } {
  if (raw === undefined) return { memberIds: null, invalid: false };
  const ids = [...new Set(typeof raw === "string" ? [raw] : raw)].sort();
  if (ids.length === 1 && ids[0] === "") return { memberIds: [], invalid: false };
  if (!ids.length || ids.some((id) => !knownIds.has(id))) return { memberIds: [], invalid: true };
  return { memberIds: ids, invalid: false };
}

export function aiUsageHref(range: number, memberIds: AiUsageSelection) {
  const params = new URLSearchParams({ range: String(range) });
  if (memberIds !== null) {
    const ids = [...new Set(memberIds)].sort();
    for (const id of ids.length ? ids : [""]) params.append("memberId", id);
  }
  return `/admin/ai-usage?${params.toString()}`;
}

export function savedAiUsageHref(range: number, selectionId: string) {
  return `/admin/ai-usage?${new URLSearchParams({ range: String(range), selection: selectionId })}`;
}
