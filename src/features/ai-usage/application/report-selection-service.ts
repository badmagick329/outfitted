import { z } from "zod";
import { ApplicationError } from "@/shared/application-error";
import type { ReportSelectionRepository } from "../domain/report-selections";
import { parseAiUsageSelection, type AiUsageSelection } from "./report-selection";

const savedSelectionRequest = z
  .object({ memberIds: z.array(z.string().min(1).max(200)).min(1).max(1000) })
  .strict();
const tokenSchema = z.uuid();
export type ReportSelectionQuery = {
  memberId?: string | string[];
  selection?: string | string[];
  user?: string | string[];
};
export type ResolvedReportSelection = {
  memberIds: AiUsageSelection;
  invalid: boolean;
  selectionId: string | null;
};

export class ReportSelectionService {
  constructor(
    private readonly repository: ReportSelectionRepository,
    private readonly authorize: () => Promise<{ userId: string }>,
  ) {}

  async create(raw: unknown) {
    const actor = await this.authorize();
    const input = savedSelectionRequest.parse(raw);
    const memberIds = [...new Set(input.memberIds)].sort();
    const known = await this.repository.knownMemberIds(memberIds);
    if (known.length !== memberIds.length)
      throw new ApplicationError(
        "VALIDATION_ERROR",
        400,
        "The selection contains an unavailable member. Choose members again.",
      );
    const saved = await this.repository.create(actor.userId, memberIds);
    return { selectionId: saved.id };
  }

  async resolve(
    query: ReportSelectionQuery,
    knownIds: ReadonlySet<string>,
  ): Promise<ResolvedReportSelection> {
    const actor = await this.authorize();
    const empty = {
      memberIds: [],
      invalid: true,
      selectionId: null,
    } satisfies ResolvedReportSelection;
    if (query.user !== undefined || (query.selection !== undefined && query.memberId !== undefined))
      return empty;
    if (query.selection === undefined)
      return { ...parseAiUsageSelection(query.memberId, knownIds), selectionId: null };
    const token = tokenSchema.safeParse(query.selection);
    if (!token.success) return empty;
    const saved = await this.repository.findForActor(token.data, actor.userId);
    if (!saved) return { ...empty, selectionId: token.data };
    // Membership may change after a link was created. A stale group must never become everyone.
    return { ...parseAiUsageSelection(saved.memberIds, knownIds), selectionId: token.data };
  }
}
