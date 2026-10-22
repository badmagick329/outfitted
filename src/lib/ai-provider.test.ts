import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import type { AiBudgetRepository } from "@/features/ai-budget/domain/repository";
import { aiBudgetPeriod } from "@/features/ai-budget/domain/period";
import { AI_MAX_OUTPUT_TOKENS, AI_RESERVATION_MICROUSD, OpenAiWardrobeProvider } from "./ai";

const actor = { userId: "member-1" };
const analysis = {
  name: "Shirt",
  description: "A cotton shirt",
  category: "Shirt",
  primaryColor: "teal",
  secondaryColors: [],
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: "Casual",
  confidence: [],
};
const outfits = {
  candidates: [
    {
      recommendation: "A shirt",
      rationale: "Works",
      referencedItemIds: ["7c1bcc30-61e7-4b82-bb99-bd73f33d926d"],
      suitabilityTier: "A",
    },
  ],
};
const review = { summary: "A casual wardrobe", strengths: [], gaps: [], observations: [] };
const operations = [
  {
    name: "garment_analysis",
    invoke: (ai: OpenAiWardrobeProvider) => ai.analyze(actor, ["data:image/webp;base64,dGVzdA=="]),
    output: analysis,
  },
  {
    name: "outfit_suggestion",
    invoke: (ai: OpenAiWardrobeProvider) => ai.suggest(actor, "Dinner", []),
    output: outfits,
  },
  {
    name: "wardrobe_review",
    invoke: (ai: OpenAiWardrobeProvider) => ai.review(actor, []),
    output: review,
  },
];

function response(output: unknown, overrides: Record<string, unknown> = {}) {
  return {
    id: "resp-1",
    object: "response",
    model: "gpt-6-luna",
    status: "completed",
    created_at: 1,
    output: [
      {
        type: "message",
        id: "message-1",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: typeof output === "string" ? output : JSON.stringify(output),
            annotations: [],
          },
        ],
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      input_tokens_details: { cached_tokens: 10, cache_write_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    },
    ...overrides,
  };
}

function dependencies(output: unknown, overrides: Record<string, unknown> = {}) {
  const budget = {
    reserve: vi.fn().mockResolvedValue({ allowed: true, reservation: { id: "hold-1" } }),
    markDispatched: vi.fn().mockResolvedValue(undefined),
    markUncertain: vi.fn().mockResolvedValue(undefined),
    settle: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response(output, overrides)), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  // Leave the SDK's default retries enabled here: request-level maxRetries:0
  // must still prevent hidden attempts at the actual paid-call boundary.
  const provider = new OpenAiWardrobeProvider(
    budget as unknown as AiBudgetRepository,
    () => new OpenAI({ apiKey: "test-only", fetch: request }),
  );
  return { budget, request, provider };
}

describe("OpenAI paid call boundary", () => {
  it.each(operations)(
    "blocks $name at the cap before any HTTP invocation",
    async ({ invoke, output }) => {
      const { budget, request, provider } = dependencies(output);
      budget.reserve.mockResolvedValueOnce({
        allowed: false,
        budget: { period: aiBudgetPeriod(new Date()) },
      });
      await expect(invoke(provider)).rejects.toMatchObject({ code: "AI_BUDGET_EXHAUSTED" });
      expect(request).not.toHaveBeenCalled();
      expect(budget.markDispatched).not.toHaveBeenCalled();
    },
  );

  it.each(operations)(
    "reserves the published maximum and enforces output/pricing options for $name",
    async ({ name, invoke, output }) => {
      const { budget, request, provider } = dependencies(output);
      await expect(invoke(provider)).resolves.toMatchObject({ data: output });
      expect(budget.reserve).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: actor.userId,
          operation: name,
          model: "gpt-6-luna",
          amountMicrousd: 236_644,
        }),
      );
      expect(AI_RESERVATION_MICROUSD).toBe(236_644);
      const body = JSON.parse(request.mock.calls[0][1].body);
      expect(body).toMatchObject({
        model: "gpt-6-luna",
        max_output_tokens: AI_MAX_OUTPUT_TOKENS,
        service_tier: "default",
        prompt_cache_retention: "in_memory",
      });
      expect(budget.settle).toHaveBeenCalledWith(
        expect.objectContaining({
          usageEvent: expect.objectContaining({
            providerRequestId: "resp-1",
            usage: {
              inputTokens: 100,
              cachedInputTokens: 10,
              cacheWriteInputTokens: 0,
              outputTokens: 20,
            },
          }),
        }),
      );
    },
  );

  it("does not retry even when an HTTP error is normally retryable", async () => {
    const { budget, request, provider } = dependencies(outfits);
    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "server error" } }), { status: 500 }),
    );
    await expect(provider.suggest(actor, "Dinner", [])).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    expect(budget.markUncertain).toHaveBeenCalledTimes(1);
    expect(budget.release).not.toHaveBeenCalled();
  });

  it("records known usage on invalid JSON without freeing the full hold as zero cost", async () => {
    const { budget, provider } = dependencies("invalid JSON");
    await expect(provider.suggest(actor, "Dinner", [])).rejects.toThrow("could not be used");
    expect(budget.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        usageEvent: expect.objectContaining({
          status: "failed",
          usage: expect.objectContaining({ inputTokens: 100 }),
        }),
      }),
    );
    expect(budget.release).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    { input_tokens: -1, output_tokens: 20, input_tokens_details: { cached_tokens: 0 } },
    {
      input_tokens: 100,
      output_tokens: 20,
      input_tokens_details: { cached_tokens: 90, cache_write_tokens: 20 },
    },
    { input_tokens: 922001, output_tokens: 20, input_tokens_details: { cached_tokens: 0 } },
    { input_tokens: 100, output_tokens: 8193, input_tokens_details: { cached_tokens: 0 } },
  ])(
    "retains the liability when usage is missing or violates the established bound",
    async (usage) => {
      const { budget, provider } = dependencies(outfits, { usage });
      await expect(provider.suggest(actor, "Dinner", [])).rejects.toThrow(
        "usage was missing or invalid",
      );
      expect(budget.markUncertain).toHaveBeenCalled();
      expect(budget.settle).not.toHaveBeenCalled();
      expect(budget.release).not.toHaveBeenCalled();
    },
  );

  it("fails closed if a model is changed without an established pricing bound", async () => {
    const { budget, request, provider } = dependencies(outfits);
    Object.defineProperty(provider, "model", { value: "unsupported-model" });
    await expect(provider.suggest(actor, "Dinner", [])).rejects.toThrow("pricing");
    expect(request).not.toHaveBeenCalled();
    expect(budget.reserve).not.toHaveBeenCalled();
  });
});
