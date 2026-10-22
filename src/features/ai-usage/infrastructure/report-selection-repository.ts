import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageReportSelections, users } from "@/lib/db/schema";
import type { ReportSelectionRepository } from "../domain/report-selections";

export class DrizzleReportSelectionRepository implements ReportSelectionRepository {
  constructor(private readonly database: typeof db = db) {}
  async knownMemberIds(memberIds: string[]) {
    const rows = await this.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, memberIds));
    return rows.map((row) => row.id);
  }
  async create(actorUserId: string, memberIds: string[]) {
    const [saved] = await this.database
      .insert(aiUsageReportSelections)
      .values({ actorUserId, memberIds })
      .returning();
    return saved;
  }
  async findForActor(id: string, actorUserId: string) {
    const [saved] = await this.database
      .select()
      .from(aiUsageReportSelections)
      .where(
        and(
          eq(aiUsageReportSelections.id, id),
          eq(aiUsageReportSelections.actorUserId, actorUserId),
        ),
      )
      .limit(1);
    return saved ?? null;
  }
}
