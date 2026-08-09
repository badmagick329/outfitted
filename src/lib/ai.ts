import OpenAI from "openai";
import { z } from "zod";

export const analysisSchema = z.object({
  name: z.string().max(160),
  description: z.string(),
  category: z.string(),
  primaryColor: z.string(),
  secondaryColors: z.array(z.string()),
  material: z.string().nullable(),
  fit: z.string().nullable(),
  styleTags: z.array(z.string()),
  seasons: z.array(z.string()),
  formality: z.string(),
  confidence: z.array(z.object({ field: z.string(), level: z.enum(["high", "medium", "low"]), note: z.string() })),
});
export type WardrobeAnalysis = z.infer<typeof analysisSchema>;
export const outfitSuggestionSchema = z.object({
  recommendation: z.string(),
  rationale: z.string(),
  referencedItemIds: z.array(z.string().uuid()),
});
export type OutfitSuggestion = z.infer<typeof outfitSuggestionSchema>;
export interface AiWardrobeProvider { analyze(images: string[]): Promise<WardrobeAnalysis>; suggest(prompt: string, wardrobe: unknown[]): Promise<OutfitSuggestion>; }

class OpenAiWardrobeProvider implements AiWardrobeProvider {
  private get client() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
  async analyze(images: string[]) {
    const response = await this.client.responses.parse({ model: "gpt-5.6-luna", input: [{ role: "user", content: [{ type: "input_text", text: "Analyze this single garment from all provided views. Identify the garment; be honest about uncertainty. For each confidence entry, use a stable field name such as category, primaryColor, material, fit, season, formality, or styleTags. Use an empty string for note when no clarification is needed." }, ...images.map((image) => ({ type: "input_image" as const, image_url: image, detail: "high" as const }))] }], text: { format: { type: "json_schema", name: "wardrobe_analysis", strict: true, schema: z.toJSONSchema(analysisSchema) } } });
    return analysisSchema.parse(JSON.parse(response.output_text));
  }
  async suggest(prompt: string, wardrobe: unknown[]) {
    const response = await this.client.responses.parse({ model: "gpt-5.6-luna", input: `Create a practical outfit recommendation for this request: ${prompt}\n\nYou may recommend only these wardrobe items:\n${JSON.stringify(wardrobe)}\n\nWrite recommendation as concise Markdown using short headings, paragraphs, and bullet lists where useful. Every mention of a recommended garment must be a Markdown link in exactly this format: [Garment name](item:THE_ITEM_UUID). Use only IDs from the wardrobe data. Do not use external links, images, or HTML. Include every linked garment ID in referencedItemIds.`, text: { format: { type: "json_schema", name: "outfit_suggestion", strict: true, schema: z.toJSONSchema(outfitSuggestionSchema) } } });
    return outfitSuggestionSchema.parse(JSON.parse(response.output_text));
  }
}
export const ai: AiWardrobeProvider = new OpenAiWardrobeProvider();
