export type AiUsageOperation = "garment_analysis" | "outfit_suggestion";
export type AiUsageStatus = "success" | "failed";

export type AiTokenUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
};

export type AiCallResult<T> = {
  data: T;
  model: string;
  providerRequestId: string | null;
  usage: AiTokenUsage;
};

export type RecordAiUsageInput = {
  userId: string;
  operation: AiUsageOperation;
  model: string;
  status: AiUsageStatus;
  providerRequestId?: string | null;
  usage?: AiTokenUsage;
  latencyMs: number;
};

export type AiUsageRecorder = {
  record(input: RecordAiUsageInput): Promise<void>;
};
