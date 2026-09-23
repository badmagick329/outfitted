import type { AiTokenUsage } from "./contracts";

export const AI_PRICING_VERSION = "gpt-6-luna-2026-09-22";

const ratesMicrousdPerToken = {
  input: 0.1,
  cachedInput: 0.01,
  cacheWriteInput: 0.125,
  output: 0.5,
} as const;

export function estimateCostMicrousd(usage: AiTokenUsage) {
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteInputTokens,
  );

  return Math.round(
    uncachedInputTokens * ratesMicrousdPerToken.input +
      usage.cachedInputTokens * ratesMicrousdPerToken.cachedInput +
      usage.cacheWriteInputTokens * ratesMicrousdPerToken.cacheWriteInput +
      usage.outputTokens * ratesMicrousdPerToken.output,
  );
}
