import type { AiBudgetRepository } from "@/features/ai-budget/domain/repository";
import { aiBudgetPeriod } from "@/features/ai-budget/domain/period";
import { aiBudgetExhausted } from "@/shared/application-error";
import type { AiCallResult, AiUsageOperation } from "../domain/contracts";

/** A provider response was received and billed even though its content was unusable. */
export class BilledAiCallError extends Error {
  constructor(
    public readonly result: Omit<AiCallResult<never>, "data">,
    options: ErrorOptions,
  ) {
    super("The AI response could not be used. Please try again.", options);
  }
}

type TrackAiCallInput<T> = {
  budget: AiBudgetRepository;
  userId: string;
  operation: AiUsageOperation;
  model: string;
  reservationMicrousd: number;
  call: (reservationId: string) => Promise<AiCallResult<T>>;
  onAdmitted?: () => Promise<void>;
  now?: () => Date;
};

export async function trackAiCall<T>({
  budget,
  userId,
  operation,
  model,
  reservationMicrousd,
  call,
  onAdmitted,
  now = () => new Date(),
}: TrackAiCallInput<T>): Promise<AiCallResult<T>> {
  const startedAt = now();
  const admission = await budget.reserve({
    userId,
    operation,
    model,
    amountMicrousd: reservationMicrousd,
    period: aiBudgetPeriod(startedAt),
    now: startedAt,
  });
  if (!admission.allowed)
    throw aiBudgetExhausted(admission.budget.period.endsAt, admission.budget.reservedMicrousd);
  const reservationId = admission.reservation.id;
  // Persist the crash boundary before sending. A failed write must never send;
  // recovery conservatively retains a marker whose commit outcome was unknown.
  await budget.markDispatched(reservationId, now());
  try {
    await onAdmitted?.();
  } catch (error) {
    await budget.release({ reservationId, definitelyUnused: true, now: now() });
    throw error;
  }
  let result: AiCallResult<T>;
  try {
    result = await call(reservationId);
  } catch (error) {
    if (error instanceof BilledAiCallError) {
      await budget.settle({
        reservationId,
        usageEvent: {
          userId,
          operation,
          ...error.result,
          status: "failed",
          latencyMs: now().getTime() - startedAt.getTime(),
        },
        now: now(),
      });
    } else {
      // A timeout, network error or cancellation does not establish zero cost.
      await budget.markUncertain(reservationId, now());
    }
    throw error;
  }
  // A failed settlement leaves the dispatched hold intact. Enforcement never
  // substitutes best-effort analytics for the durable accounting transaction.
  await budget.settle({
    reservationId,
    usageEvent: {
      userId,
      operation,
      model: result.model,
      providerRequestId: result.providerRequestId,
      usage: result.usage,
      status: "success",
      latencyMs: now().getTime() - startedAt.getTime(),
    },
    now: now(),
  });
  return result;
}
