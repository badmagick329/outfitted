import type { AiCallResult, AiUsageOperation, AiUsageRecorder } from "../domain/contracts";

type TrackAiCallInput<T> = {
  recorder?: AiUsageRecorder;
  userId: string;
  operation: AiUsageOperation;
  model: string;
  call: () => Promise<AiCallResult<T>>;
};

async function recordSafely(
  recorder: AiUsageRecorder | undefined,
  input: Parameters<AiUsageRecorder["record"]>[0],
) {
  if (!recorder) return;
  try {
    await recorder.record(input);
  } catch (error) {
    console.error("Unable to record AI usage", error);
  }
}

export async function trackAiCall<T>({
  recorder,
  userId,
  operation,
  model,
  call,
}: TrackAiCallInput<T>) {
  const startedAt = Date.now();
  try {
    const result = await call();
    await recordSafely(recorder, {
      userId,
      operation,
      model: result.model,
      status: "success",
      providerRequestId: result.providerRequestId,
      usage: result.usage,
      latencyMs: Date.now() - startedAt,
    });
    return result.data;
  } catch (error) {
    await recordSafely(recorder, {
      userId,
      operation,
      model,
      status: "failed",
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }
}
