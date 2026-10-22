import { describe, expect, it, vi } from "vitest";
import type { AiBudgetRepository } from "@/features/ai-budget/domain/repository";
import { aiBudgetPeriod } from "@/features/ai-budget/domain/period";
import { BilledAiCallError, trackAiCall } from "./track-ai-call";

const at = new Date("2026-10-31T23:59:59Z");
const result = {
  data: { name: "Berry jacket" },
  model: "gpt-6-luna",
  providerRequestId: "response-1",
  usage: { inputTokens: 100, cachedInputTokens: 10, cacheWriteInputTokens: 0, outputTokens: 20 },
};

function dependencies() {
  const budget = {
    reserve: vi.fn().mockResolvedValue({ allowed: true, reservation: { id: "hold-1" } }),
    markDispatched: vi.fn().mockResolvedValue(undefined),
    markUncertain: vi.fn().mockResolvedValue(undefined),
    settle: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
  const call = vi.fn().mockResolvedValue(result);
  return {
    budget,
    call,
    input: {
      budget: budget as unknown as AiBudgetRepository,
      userId: "user-1",
      operation: "garment_analysis" as const,
      model: "gpt-6-luna",
      reservationMicrousd: 236_644,
      call,
      now: () => at,
    },
  };
}

describe("paid AI accounting", () => {
  it("reserves and persists dispatch before invoking the provider, then settles actual usage", async () => {
    const { budget, call, input } = dependencies();
    await expect(trackAiCall(input)).resolves.toBe(result);
    expect(budget.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ period: aiBudgetPeriod(at), amountMicrousd: 236_644 }),
    );
    expect(budget.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      budget.markDispatched.mock.invocationCallOrder[0],
    );
    expect(budget.markDispatched.mock.invocationCallOrder[0]).toBeLessThan(
      call.mock.invocationCallOrder[0],
    );
    expect(budget.settle).toHaveBeenCalledWith({
      reservationId: "hold-1",
      now: at,
      usageEvent: {
        userId: "user-1",
        operation: "garment_analysis",
        model: result.model,
        providerRequestId: "response-1",
        usage: result.usage,
        status: "success",
        latencyMs: 0,
      },
    });
  });

  it("rejects exhausted budgets with a stable reset timestamp and zero provider calls", async () => {
    const { budget, call, input } = dependencies();
    const onAdmitted = vi.fn();
    budget.reserve.mockResolvedValueOnce({
      allowed: false,
      budget: { period: aiBudgetPeriod(at) },
    });
    await expect(trackAiCall({ ...input, onAdmitted })).rejects.toMatchObject({
      code: "AI_BUDGET_EXHAUSTED",
      status: 429,
      resetAt: "2026-11-01T00:00:00.000Z",
    });
    expect(call).not.toHaveBeenCalled();
    expect(onAdmitted).not.toHaveBeenCalled();
    expect(budget.markDispatched).not.toHaveBeenCalled();
  });

  it.each(["reserve", "markDispatched"] as const)(
    "fails closed when %s persistence fails",
    async (method) => {
      const { budget, call, input } = dependencies();
      budget[method].mockRejectedValueOnce(new Error("database unavailable"));
      await expect(trackAiCall(input)).rejects.toThrow("database unavailable");
      expect(call).not.toHaveBeenCalled();
      expect(budget.release).not.toHaveBeenCalled();
    },
  );

  it("releases a genuinely unsent call when the admission hook rejects", async () => {
    const { budget, call, input } = dependencies();
    await expect(
      trackAiCall({
        ...input,
        onAdmitted: async () => {
          throw new Error("expired grant run");
        },
      }),
    ).rejects.toThrow("expired grant run");
    expect(call).not.toHaveBeenCalled();
    expect(budget.release).toHaveBeenCalledWith({
      reservationId: "hold-1",
      definitelyUnused: true,
      now: at,
    });
  });

  it("never consumes a grant when recovery invalidated an unsent reservation", async () => {
    const { budget, call, input } = dependencies();
    budget.markDispatched.mockRejectedValueOnce(new Error("reservation was released by recovery"));
    const onAdmitted = vi.fn();
    await expect(trackAiCall({ ...input, onAdmitted })).rejects.toThrow("released by recovery");
    expect(onAdmitted).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("settles returned billable usage even when output parsing failed", async () => {
    const { budget, call, input } = dependencies();
    const failure = new BilledAiCallError(result, { cause: new Error("invalid JSON") });
    call.mockRejectedValueOnce(failure);
    await expect(trackAiCall(input)).rejects.toBe(failure);
    expect(budget.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        usageEvent: expect.objectContaining({
          status: "failed",
          usage: result.usage,
          providerRequestId: "response-1",
        }),
      }),
    );
    expect(budget.markUncertain).not.toHaveBeenCalled();
  });

  it.each(["timeout", "network error", "cancellation"])(
    "retains an unknown liability after %s",
    async (message) => {
      const { budget, call, input } = dependencies();
      call.mockRejectedValueOnce(new Error(message));
      await expect(trackAiCall(input)).rejects.toThrow(message);
      expect(budget.markUncertain).toHaveBeenCalledWith("hold-1", at);
      expect(budget.release).not.toHaveBeenCalled();
      expect(budget.settle).not.toHaveBeenCalled();
    },
  );

  it("retains the dispatched liability when usage settlement fails", async () => {
    const { budget, input } = dependencies();
    budget.settle.mockRejectedValueOnce(new Error("commit outcome unknown"));
    await expect(trackAiCall(input)).rejects.toThrow("commit outcome unknown");
    expect(budget.release).not.toHaveBeenCalled();
  });

  it("completes after midnight against the original reservation rather than re-admitting", async () => {
    const { budget, input } = dependencies();
    const clock = vi.fn().mockReturnValueOnce(at).mockReturnValue(new Date("2026-11-01T00:01:00Z"));
    await trackAiCall({ ...input, now: clock });
    expect(budget.reserve).toHaveBeenCalledTimes(1);
    expect(budget.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ period: expect.objectContaining({ key: "2026-10" }) }),
    );
    expect(budget.settle).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: "hold-1", now: new Date("2026-11-01T00:01:00Z") }),
    );
  });
});
