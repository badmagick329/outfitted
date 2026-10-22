import type {
  AiBudgetPeriod,
  AiBudgetReservation,
  AiBudgetSnapshot,
  ReserveAiBudgetInput,
  ReserveAiBudgetResult,
  SettleAiBudgetInput,
} from "./contracts";

export interface AiBudgetRepository {
  getDefaultLimit(): Promise<number>;
  getBudgets(userIds: string[], period: AiBudgetPeriod): Promise<AiBudgetSnapshot[]>;
  setDefaultLimit(amountMicrousd: number, actorUserId: string, now: Date): Promise<void>;
  setMemberOverride(
    userId: string,
    amountMicrousd: number | null,
    actorUserId: string,
    now: Date,
  ): Promise<void>;
  reserve(input: ReserveAiBudgetInput): Promise<ReserveAiBudgetResult>;
  /** Persist before sending: recovery may release only reservations still in reserved. */
  markDispatched(reservationId: string, now: Date): Promise<void>;
  markUncertain(reservationId: string, now: Date): Promise<void>;
  /** Inserts usage and reconciles the hold in the same transaction; repeat settlement is idempotent. */
  settle(input: SettleAiBudgetInput): Promise<void>;
  release(input: { reservationId: string; definitelyUnused: boolean; now: Date }): Promise<void>;
  /** Releases stale unsent holds; dispatched/uncertain holds remain charged against availability. */
  recover(before: Date, now: Date): Promise<AiBudgetReservation[]>;
}
