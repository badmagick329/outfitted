import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";
import type { AiBudgetRepository } from "@/features/ai-budget/domain/repository";
import { aiBudgetRepository } from "@/features/ai-budget/server";
import { BilledAiCallError, trackAiCall } from "@/features/ai-usage/application/track-ai-call";
import type { AiUsageOperation } from "@/features/ai-usage/domain/contracts";
import type { AiCallResult } from "@/features/ai-usage/domain/contracts";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import {
  detailedCategorySchema,
  formalitySchema,
} from "@/features/wardrobe/domain/category-groups";
import type { VocabularyEntry } from "@/features/wardrobe/domain/metadata";
import { seasonValues } from "@/features/wardrobe/domain/metadata";
import {
  wardrobeReviewReportSchema,
  type WardrobeReviewReport,
  type WardrobeReviewSourceItem,
} from "@/features/wardrobe-review/domain/contracts";
import {
  buildGarmentAnalysisPrompt,
  buildOutfitSuggestionPrompt,
  buildWardrobeReviewPrompt,
} from "./ai-prompts";

export const AI_MODEL = "gpt-6-luna";
export const AI_MAX_OUTPUT_TOKENS = 8192;
// Full published model input capacity bounds every text/schema/image input,
// including image tokenization not documented for this model. Cache writes cost
// more than uncached input; long-context rates apply to the entire request.
export const AI_RESERVATION_MICROUSD = Math.ceil(922_000 * 0.25 + AI_MAX_OUTPUT_TOKENS * 0.75);
export type AiCallContext = { userId: string; onAdmitted?: () => Promise<void> };
export const analysisSchema = z.object({
  name: z.string().max(160),
  description: z.string(),
  category: detailedCategorySchema,
  primaryColor: z.string(),
  secondaryColors: z.array(z.string()),
  material: z.string().nullable(),
  fit: z.string().nullable(),
  styleTags: z.array(z.string()).max(5),
  seasons: z.array(z.enum(seasonValues)).max(4),
  formality: formalitySchema,
  confidence: z.array(
    z.object({ field: z.string(), level: z.enum(["high", "medium", "low"]), note: z.string() }),
  ),
});
export type GarmentAnalysisResult = z.infer<typeof analysisSchema>;
export type WardrobeAnalysis = GarmentAnalysisResult & {
  categoryGroup: import("@/features/wardrobe/domain/category-groups").CategoryGroup;
};
export const outfitSuggestionCandidateSchema = z.object({
  recommendation: z.string(),
  rationale: z.string(),
  referencedItemIds: z.array(z.string().uuid()),
  suitabilityTier: z.enum(["A", "B", "C"]),
});
export const outfitSuggestionBatchSchema = z.object({
  candidates: z.array(outfitSuggestionCandidateSchema).min(1).max(4),
});
export type OutfitSuggestionCandidate = z.infer<typeof outfitSuggestionCandidateSchema>;
export type OutfitSuggestionBatch = z.infer<typeof outfitSuggestionBatchSchema>;

export interface AiWardrobeProvider {
  readonly model: string;
  analyze(
    actor: AiCallContext,
    images: string[],
    context?: { existingStyleTags: VocabularyEntry[] },
  ): Promise<AiCallResult<GarmentAnalysisResult>>;
  suggest(
    actor: AiCallContext,
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds?: string[][],
  ): Promise<AiCallResult<OutfitSuggestionBatch>>;
  review(
    actor: AiCallContext,
    wardrobe: WardrobeReviewSourceItem[],
    styleProfile?: StyleProfile | null,
  ): Promise<AiCallResult<WardrobeReviewReport>>;
}

export class OpenAiWardrobeProvider implements AiWardrobeProvider {
  readonly model = AI_MODEL;
  constructor(
    private readonly budget: AiBudgetRepository,
    private readonly createClient = () =>
      new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://api.openai.com/v1",
        maxRetries: 0,
      }),
  ) {}

  private async execute<T>(
    actor: AiCallContext,
    operation: AiUsageOperation,
    request: ResponseCreateParamsNonStreaming,
    schema: z.ZodType<T>,
  ): Promise<AiCallResult<T>> {
    if (request.model !== AI_MODEL || request.tools?.length)
      throw new Error("AI model pricing or tool billing has not been established.");
    const client = this.createClient();
    return trackAiCall({
      budget: this.budget,
      userId: actor.userId,
      onAdmitted: actor.onAdmitted,
      operation,
      model: this.model,
      reservationMicrousd: AI_RESERVATION_MICROUSD,
      call: async (reservationId) => {
        const response = await client.responses.create(
          {
            ...request,
            max_output_tokens: AI_MAX_OUTPUT_TOKENS,
            service_tier: "default",
            prompt_cache_retention: "in_memory",
            metadata: { budget_reservation_id: reservationId },
          },
          { maxRetries: 0, headers: { "X-Client-Request-Id": reservationId } },
        );
        const usage = response.usage;
        const input = usage?.input_tokens;
        const output = usage?.output_tokens;
        const cached = usage?.input_tokens_details?.cached_tokens;
        const written = usage?.input_tokens_details?.cache_write_tokens ?? 0;
        if (
          !usage ||
          [input, output, cached, written].some(
            (tokens) => !Number.isSafeInteger(tokens) || tokens! < 0,
          ) ||
          input! > 922_000 ||
          output! > AI_MAX_OUTPUT_TOKENS ||
          cached! + written > input!
        )
          throw new Error("AI billable usage was missing or invalid.");
        const billed = {
          model: this.model,
          providerRequestId: response.id,
          usage: {
            inputTokens: usage.input_tokens,
            cachedInputTokens: cached!,
            cacheWriteInputTokens: written,
            outputTokens: usage.output_tokens,
          },
        };
        try {
          if (response.status !== "completed") throw new Error("AI response was incomplete.");
          return { ...billed, data: schema.parse(JSON.parse(response.output_text)) };
        } catch (cause) {
          throw new BilledAiCallError(billed, { cause });
        }
      },
    });
  }

  async analyze(
    actor: AiCallContext,
    images: string[],
    context: { existingStyleTags: VocabularyEntry[] } = { existingStyleTags: [] },
  ) {
    return this.execute(
      actor,
      "garment_analysis",
      {
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: buildGarmentAnalysisPrompt(context.existingStyleTags) },
              ...images.map((image) => ({
                type: "input_image" as const,
                image_url: image,
                detail: "high" as const,
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "wardrobe_analysis",
            strict: true,
            schema: z.toJSONSchema(analysisSchema),
          },
        },
      },
      analysisSchema,
    );
  }

  async suggest(
    actor: AiCallContext,
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds: string[][] = [],
  ) {
    return this.execute(
      actor,
      "outfit_suggestion",
      {
        model: this.model,
        input: buildOutfitSuggestionPrompt(prompt, wardrobe, styleProfile, excludedOutfitItemIds),
        text: {
          format: {
            type: "json_schema",
            name: "outfit_suggestion_batch",
            strict: true,
            schema: z.toJSONSchema(outfitSuggestionBatchSchema),
          },
        },
      },
      outfitSuggestionBatchSchema,
    );
  }

  async review(
    actor: AiCallContext,
    wardrobe: WardrobeReviewSourceItem[],
    styleProfile?: StyleProfile | null,
  ) {
    return this.execute(
      actor,
      "wardrobe_review",
      {
        model: this.model,
        input: buildWardrobeReviewPrompt(wardrobe, styleProfile),
        text: {
          format: {
            type: "json_schema",
            name: "wardrobe_review",
            strict: true,
            schema: z.toJSONSchema(wardrobeReviewReportSchema),
          },
        },
      },
      wardrobeReviewReportSchema,
    );
  }
}
export const ai: AiWardrobeProvider = new OpenAiWardrobeProvider(aiBudgetRepository);
