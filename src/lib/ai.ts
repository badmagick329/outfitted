import OpenAI from "openai";
import { z } from "zod";
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

export const AI_MODEL = "gpt-5.6-luna";
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
    images: string[],
    context?: { existingStyleTags: VocabularyEntry[] },
  ): Promise<AiCallResult<GarmentAnalysisResult>>;
  suggest(
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds?: string[][],
  ): Promise<AiCallResult<OutfitSuggestionBatch>>;
  review(
    wardrobe: WardrobeReviewSourceItem[],
    styleProfile?: StyleProfile | null,
  ): Promise<AiCallResult<WardrobeReviewReport>>;
}

class OpenAiWardrobeProvider implements AiWardrobeProvider {
  readonly model = AI_MODEL;
  private get client() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async analyze(
    images: string[],
    context: { existingStyleTags: VocabularyEntry[] } = { existingStyleTags: [] },
  ) {
    const response = await this.client.responses.parse({
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
    });
    return {
      data: analysisSchema.parse(JSON.parse(response.output_text)),
      model: this.model,
      providerRequestId: response.id,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteInputTokens: response.usage?.input_tokens_details.cache_write_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  async suggest(
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds: string[][] = [],
  ) {
    const response = await this.client.responses.parse({
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
    });
    return {
      data: outfitSuggestionBatchSchema.parse(JSON.parse(response.output_text)),
      model: this.model,
      providerRequestId: response.id,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteInputTokens: response.usage?.input_tokens_details.cache_write_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  async review(wardrobe: WardrobeReviewSourceItem[], styleProfile?: StyleProfile | null) {
    const response = await this.client.responses.parse({
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
    });
    return {
      data: wardrobeReviewReportSchema.parse(JSON.parse(response.output_text)),
      model: this.model,
      providerRequestId: response.id,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteInputTokens: response.usage?.input_tokens_details.cache_write_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}
export const ai: AiWardrobeProvider = new OpenAiWardrobeProvider();
