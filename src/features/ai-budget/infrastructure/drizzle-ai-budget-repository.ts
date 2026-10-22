import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aiBudgetOverrides,
  aiBudgetAuditEvents,
  aiBudgetReservations,
  aiBudgetSettings,
  aiUsageEvents,
  users,
} from "@/lib/db/schema";
import { notFound } from "@/shared/application-error";
import { AI_PRICING_VERSION, estimateCostMicrousd } from "@/features/ai-usage/domain/pricing";
import {
  budgetAmountSchema,
  budgetSnapshot,
  DEFAULT_AI_BUDGET_MICROUSD,
  type AiBudgetPeriod,
  type AiBudgetReservation,
  type ReserveAiBudgetInput,
  type SettleAiBudgetInput,
} from "../domain/contracts";
import type { AiBudgetRepository } from "../domain/repository";
import { aiBudgetPeriod } from "../domain/period";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ReservationRow = typeof aiBudgetReservations.$inferSelect;
type BudgetRow = {
  user_id: string;
  default_limit: number;
  override_limit: number | null;
  spent: string;
  reserved: string;
};

function asReservation(row: ReservationRow): AiBudgetReservation {
  return {
    id: row.id,
    userId: row.userId,
    operation: row.operation as AiBudgetReservation["operation"],
    model: row.model,
    period: { key: row.periodKey, startsAt: row.periodStartsAt, endsAt: row.periodEndsAt },
    amountMicrousd: row.amountMicrousd,
    actualCostMicrousd: row.actualCostMicrousd,
    status: row.status as AiBudgetReservation["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleAiBudgetRepository implements AiBudgetRepository {
  constructor(private readonly database: Database = db) {}

  async getDefaultLimit() {
    const [row] = await this.database
      .select()
      .from(aiBudgetSettings)
      .where(eq(aiBudgetSettings.id, "singleton"));
    return row?.defaultLimitMicrousd ?? DEFAULT_AI_BUDGET_MICROUSD;
  }

  getBudgets(userIds: string[], period: AiBudgetPeriod) {
    return this.readBudgets(this.database, userIds, period);
  }

  listAuditEvents() {
    return this.database
      .select()
      .from(aiBudgetAuditEvents)
      .orderBy(desc(aiBudgetAuditEvents.createdAt));
  }

  private async readBudgets(
    executor: Database | Transaction,
    userIds: string[],
    period: AiBudgetPeriod,
  ) {
    if (!userIds.length) return [];
    const ids = sql.join(
      [...new Set(userIds)].map((id) => sql`${id}`),
      sql`, `,
    );
    // Legacy events stay authoritative. New linked events are represented by their
    // reservation's original month, so settlement across midnight never counts twice.
    const result = await executor.execute<BudgetRow>(sql`
      WITH legacy AS (
        SELECT user_id, sum(estimated_cost_microusd) AS spent
        FROM ai_usage_events
        WHERE user_id IN (${ids}) AND budget_reservation_id IS NULL
          AND created_at >= ${period.startsAt} AND created_at < ${period.endsAt}
        GROUP BY user_id
      ), reservations AS (
        SELECT user_id,
          coalesce(sum(actual_cost_microusd) FILTER (WHERE status = 'settled'), 0) AS spent,
          coalesce(sum(amount_microusd) FILTER (WHERE status IN ('reserved', 'dispatched', 'uncertain')), 0) AS reserved
        FROM ai_budget_reservations WHERE user_id IN (${ids}) AND period_key = ${period.key}
        GROUP BY user_id
      )
      SELECT u.id AS user_id,
        coalesce((SELECT default_limit_microusd FROM ai_budget_settings WHERE id = 'singleton'), ${DEFAULT_AI_BUDGET_MICROUSD}) AS default_limit,
        o.limit_microusd AS override_limit,
        (coalesce(l.spent, 0) + coalesce(r.spent, 0))::bigint AS spent,
        coalesce(r.reserved, 0)::bigint AS reserved
      FROM users u LEFT JOIN ai_budget_overrides o ON o.user_id = u.id
      LEFT JOIN legacy l ON l.user_id = u.id LEFT JOIN reservations r ON r.user_id = u.id
      WHERE u.id IN (${ids})
    `);
    const byId = new Map(
      result.rows.map((row) => [
        row.user_id,
        budgetSnapshot({
          userId: row.user_id,
          period,
          defaultLimitMicrousd: row.default_limit,
          overrideLimitMicrousd: row.override_limit,
          spentMicrousd: Number(row.spent),
          reservedMicrousd: Number(row.reserved),
        }),
      ]),
    );
    return [...new Set(userIds)].flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }

  // Global shared locks permit independent members concurrently; the exclusive
  // default-edit lock prevents admitting a call against a superseded limit.
  private async lockMember(transaction: Transaction, userId: string) {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock_shared(72440, 0)`);
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(72441, hashtext(${userId}))`);
  }

  async setDefaultLimit(amountMicrousd: number, actorUserId: string, now: Date) {
    await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT pg_advisory_xact_lock(72440, 0)`);
      const [previous] = await transaction
        .select()
        .from(aiBudgetSettings)
        .where(eq(aiBudgetSettings.id, "singleton"));
      const previousLimitMicrousd = previous?.defaultLimitMicrousd ?? DEFAULT_AI_BUDGET_MICROUSD;
      if (previousLimitMicrousd === amountMicrousd) return;
      await transaction
        .insert(aiBudgetSettings)
        .values({
          id: "singleton",
          defaultLimitMicrousd: amountMicrousd,
          updatedByUserId: actorUserId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: aiBudgetSettings.id,
          set: {
            defaultLimitMicrousd: amountMicrousd,
            updatedByUserId: actorUserId,
            updatedAt: now,
          },
        });
      await transaction.insert(aiBudgetAuditEvents).values({
        scope: "default",
        actorUserId,
        previousLimitMicrousd,
        nextLimitMicrousd: amountMicrousd,
        createdAt: now,
      });
    });
  }

  async setMemberOverride(
    userId: string,
    amountMicrousd: number | null,
    actorUserId: string,
    now: Date,
  ) {
    await this.database.transaction(async (transaction) => {
      await this.lockMember(transaction, userId);
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));
      if (!user) throw notFound("Member not found.");
      const [previous] = await transaction
        .select()
        .from(aiBudgetOverrides)
        .where(eq(aiBudgetOverrides.userId, userId));
      const previousLimitMicrousd = previous?.limitMicrousd ?? null;
      if (previousLimitMicrousd === amountMicrousd) return;
      if (amountMicrousd === null) {
        await transaction.delete(aiBudgetOverrides).where(eq(aiBudgetOverrides.userId, userId));
      } else {
        await transaction
          .insert(aiBudgetOverrides)
          .values({
            userId,
            limitMicrousd: amountMicrousd,
            updatedByUserId: actorUserId,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: aiBudgetOverrides.userId,
            set: {
              limitMicrousd: amountMicrousd,
              updatedByUserId: actorUserId,
              updatedAt: now,
            },
          });
      }
      await transaction.insert(aiBudgetAuditEvents).values({
        scope: "member",
        targetUserId: userId,
        actorUserId,
        previousLimitMicrousd,
        nextLimitMicrousd: amountMicrousd,
        createdAt: now,
      });
    });
  }

  async reserve(input: ReserveAiBudgetInput) {
    budgetAmountSchema.min(1).parse(input.amountMicrousd);
    const period = aiBudgetPeriod(input.now);
    if (
      period.key !== input.period.key ||
      period.startsAt.getTime() !== input.period.startsAt.getTime() ||
      period.endsAt.getTime() !== input.period.endsAt.getTime()
    ) {
      throw new Error("Reservation period must match its admission time.");
    }
    return this.database.transaction(async (transaction) => {
      await this.lockMember(transaction, input.userId);
      const [budget] = await this.readBudgets(transaction, [input.userId], period);
      if (!budget) throw notFound("Member not found.");
      if (budget.availableMicrousd < input.amountMicrousd)
        return { allowed: false as const, budget };
      const [row] = await transaction
        .insert(aiBudgetReservations)
        .values({
          userId: input.userId,
          operation: input.operation,
          model: input.model,
          periodKey: period.key,
          periodStartsAt: period.startsAt,
          periodEndsAt: period.endsAt,
          amountMicrousd: input.amountMicrousd,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();
      return { allowed: true as const, reservation: asReservation(row) };
    });
  }

  private async withReservation<T>(
    reservationId: string,
    work: (transaction: Transaction, row: ReservationRow) => Promise<T>,
  ) {
    return this.database.transaction(async (transaction) => {
      const [initial] = await transaction
        .select()
        .from(aiBudgetReservations)
        .where(eq(aiBudgetReservations.id, reservationId));
      if (!initial) throw notFound("AI budget reservation not found.");
      await this.lockMember(transaction, initial.userId);
      const [row] = await transaction
        .select()
        .from(aiBudgetReservations)
        .where(eq(aiBudgetReservations.id, reservationId))
        .for("update");
      if (!row) throw notFound("AI budget reservation not found.");
      return work(transaction, row);
    });
  }

  async markDispatched(reservationId: string, now: Date) {
    await this.withReservation(reservationId, async (transaction, row) => {
      if (row.status !== "reserved")
        throw new Error("Only an unsent reservation can be dispatched.");
      await transaction
        .update(aiBudgetReservations)
        .set({ status: "dispatched", updatedAt: now })
        .where(eq(aiBudgetReservations.id, reservationId));
    });
  }

  async markUncertain(reservationId: string, now: Date) {
    await this.withReservation(reservationId, async (transaction, row) => {
      if (row.status === "uncertain" || row.status === "settled") return;
      if (row.status !== "dispatched")
        throw new Error("Only a dispatched reservation can have an uncertain outcome.");
      await transaction
        .update(aiBudgetReservations)
        .set({ status: "uncertain", updatedAt: now })
        .where(eq(aiBudgetReservations.id, reservationId));
    });
  }

  async settle(input: SettleAiBudgetInput) {
    await this.withReservation(input.reservationId, async (transaction, row) => {
      if (row.status === "settled") return;
      if (row.status === "released") throw new Error("A released reservation cannot be settled.");
      const usage = input.usageEvent;
      if (
        usage.userId !== row.userId ||
        usage.operation !== row.operation ||
        usage.model !== row.model
      )
        throw new Error("Usage must belong to its reservation.");
      if (!usage.usage) throw new Error("Settlement requires known provider usage.");
      const cost = budgetAmountSchema.parse(estimateCostMicrousd(usage.usage));
      await transaction.insert(aiUsageEvents).values({
        budgetReservationId: row.id,
        userId: row.userId,
        operation: row.operation,
        model: row.model,
        status: usage.status,
        providerRequestId: usage.providerRequestId,
        ...usage.usage,
        estimatedCostMicrousd: cost,
        latencyMs: usage.latencyMs,
        pricingVersion: AI_PRICING_VERSION,
        createdAt: input.now,
      });
      await transaction
        .update(aiBudgetReservations)
        .set({ status: "settled", actualCostMicrousd: cost, updatedAt: input.now })
        .where(eq(aiBudgetReservations.id, row.id));
    });
  }

  async release(input: { reservationId: string; definitelyUnused: boolean; now: Date }) {
    await this.withReservation(input.reservationId, async (transaction, row) => {
      if (row.status === "released") return;
      if (row.status === "settled") throw new Error("Settled spend cannot be released.");
      if (row.status !== "reserved" && !input.definitelyUnused)
        throw new Error("Uncertain provider charges must retain their reservation.");
      await transaction
        .update(aiBudgetReservations)
        .set({ status: "released", updatedAt: input.now })
        .where(eq(aiBudgetReservations.id, row.id));
    });
  }

  async recover(before: Date, now: Date) {
    const candidates = await this.database
      .select({ id: aiBudgetReservations.id })
      .from(aiBudgetReservations)
      .where(
        and(
          inArray(aiBudgetReservations.status, ["reserved", "dispatched", "uncertain"]),
          lt(aiBudgetReservations.updatedAt, before),
        ),
      );
    const unresolved: AiBudgetReservation[] = [];
    for (const { id } of candidates) {
      await this.withReservation(id, async (transaction, row) => {
        if (row.updatedAt >= before || row.status === "settled" || row.status === "released")
          return;
        if (row.status === "reserved") {
          await transaction
            .update(aiBudgetReservations)
            .set({ status: "released", updatedAt: now })
            .where(eq(aiBudgetReservations.id, id));
        } else {
          await transaction
            .update(aiBudgetReservations)
            .set({ status: "uncertain", updatedAt: now })
            .where(eq(aiBudgetReservations.id, id));
          unresolved.push(asReservation({ ...row, status: "uncertain", updatedAt: now }));
        }
      });
    }
    return unresolved;
  }
}
