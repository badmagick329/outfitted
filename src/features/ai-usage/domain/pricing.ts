import type { AiTokenUsage } from "./contracts";

export const AI_PRICING_VERSION = "gpt-5.6-luna-2026-08-10";

const ratesMicrousdPerToken = {
  input: 0.2,
  cachedInput: 0.02,
  cacheWriteInput: 0.25,
  output: 1.2,
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
