import { forbidden } from "@/shared/application-error";
import { budgetAmountSchema, type BudgetClock } from "../domain/contracts";
import { aiBudgetPeriod } from "../domain/period";
import type { AiBudgetRepository } from "../domain/repository";

export class AiBudgetService {
  constructor(
    private readonly repository: AiBudgetRepository,
    private readonly canAdminister: (actorUserId: string) => Promise<boolean>,
    private readonly clock: BudgetClock = { now: () => new Date() },
  ) {}

  getDefaultLimit() {
    return this.repository.getDefaultLimit();
  }

  getBudgets(userIds: string[]) {
    return this.repository.getBudgets([...new Set(userIds)], aiBudgetPeriod(this.clock.now()));
  }

  async setDefaultLimit(actorUserId: string, amount: unknown) {
    await this.authorize(actorUserId);
    await this.repository.setDefaultLimit(
      budgetAmountSchema.parse(amount),
      actorUserId,
      this.clock.now(),
    );
  }

  async setMemberOverride(actorUserId: string, userId: string, amount: unknown) {
    await this.authorize(actorUserId);
    const parsed = amount === null ? null : budgetAmountSchema.parse(amount);
    await this.repository.setMemberOverride(userId, parsed, actorUserId, this.clock.now());
  }

  private async authorize(actorUserId: string) {
    if (!(await this.canAdminister(actorUserId)))
      throw forbidden("Administrator access is required.");
  }
}
