import OpenAI from "openai";
import { z } from "zod";

export const analysisSchema = z.object({ name: z.string().max(160), description: z.string(), category: z.string(), primaryColor: z.string(), secondaryColors: z.array(z.string()), material: z.string().nullable(), fit: z.string().nullable(), styleTags: z.array(z.string()), seasons: z.array(z.string()), formality: z.string(), confidence: z.record(z.string(), z.string()) });
export type WardrobeAnalysis = z.infer<typeof analysisSchema>;
export interface AiWardrobeProvider { analyze(images: string[]): Promise<WardrobeAnalysis>; suggest(prompt: string, wardrobe: unknown[]): Promise<{ recommendation: string; rationale: string }>; }

class OpenAiWardrobeProvider implements AiWardrobeProvider {
  private get client() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
  async analyze(images: string[]) {
    const response = await this.client.responses.parse({ model: "gpt-5.6-luna", input: [{ role: "user", content: [{ type: "input_text", text: "Analyze this single garment from all provided views. Identify the garment; be honest about uncertainty." }, ...images.map((image) => ({ type: "input_image" as const, image_url: image, detail: "high" as const }))] }], text: { format: { type: "json_schema", name: "wardrobe_analysis", strict: true, schema: z.toJSONSchema(analysisSchema) } } });
    return analysisSchema.parse(JSON.parse(response.output_text));
  }
  async suggest(prompt: string, wardrobe: unknown[]) {
    const response = await this.client.responses.create({ model: "gpt-5.6-luna", input: `User request: ${prompt}\n\nWardrobe metadata (only these items may be recommended):\n${JSON.stringify(wardrobe)}` });
    return { recommendation: response.output_text, rationale: "Built from your saved wardrobe metadata." };
  }
}
export const ai: AiWardrobeProvider = new OpenAiWardrobeProvider();
