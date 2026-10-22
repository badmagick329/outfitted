import { z } from "zod";
import {
  aiUsageHref,
  savedAiUsageHref,
  type AiUsageSelection,
} from "../application/report-selection";

const savedResponse = z.object({ selectionId: z.uuid() });

export async function createAiUsageHref(
  range: number,
  memberIds: AiUsageSelection,
): Promise<string> {
  const uniqueIds = memberIds === null ? null : [...new Set(memberIds)].sort();
  if (uniqueIds === null || uniqueIds.length <= 100) return aiUsageHref(range, uniqueIds);
  const response = await fetch("/api/admin/ai-usage/selections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds: uniqueIds }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.object({ message: z.string() }) }).safeParse(payload);
    throw new Error(
      error.success ? error.data.error.message : "Couldn’t save the member selection. Try again.",
    );
  }
  return savedAiUsageHref(range, savedResponse.parse(payload).selectionId);
}
