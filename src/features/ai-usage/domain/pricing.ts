import type { AiTokenUsage } from "./contracts";

export const AI_PRICING_VERSION = "gpt-6-luna-2026-10-01";

const ratesMicrousdPerToken = {
  input: 0.1,
  cachedInput: 0.01,
  cacheWriteInput: 0.125,
  output: 0.5,
} as const;

// Prompts above this size are billed at long-context rates for the whole
// request, not just the tokens past the threshold.
const longContextInputTokenThreshold = 272_000;
const longContextInputMultiplier = 2;
const longContextOutputMultiplier = 1.5;

export function estimateCostMicrousd(usage: AiTokenUsage) {
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteInputTokens,
  );
  const isLongContext = usage.inputTokens > longContextInputTokenThreshold;
  const inputMultiplier = isLongContext ? longContextInputMultiplier : 1;
  const outputMultiplier = isLongContext ? longContextOutputMultiplier : 1;

  return Math.round(
    (uncachedInputTokens * ratesMicrousdPerToken.input +
      usage.cachedInputTokens * ratesMicrousdPerToken.cachedInput +
      usage.cacheWriteInputTokens * ratesMicrousdPerToken.cacheWriteInput) *
      inputMultiplier +
      usage.outputTokens * ratesMicrousdPerToken.output * outputMultiplier,
  );
}
