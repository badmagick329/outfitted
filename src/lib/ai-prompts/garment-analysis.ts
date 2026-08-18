import {
  detailedCategoryValues,
  formalityValues,
} from "@/features/wardrobe/domain/category-groups";
import type { VocabularyEntry } from "@/features/wardrobe/domain/metadata";

export function buildGarmentAnalysisPrompt(existingStyleTags: VocabularyEntry[] = []) {
  const vocabulary = existingStyleTags.length
    ? `\nEXISTING STYLE-TAG VOCABULARY\n${existingStyleTags.map(({ value, count }) => `${value} (${count})`).join("\n")}\n`
    : "";
  return `Analyze the single garment shown across all provided views.

The resulting structured record will be the only representation available to other models when they later compare this garment, choose outfits, and review the wardrobe. Those models will not receive the images. Create a compact, evidence-based record that lets another model distinguish this garment from similar pieces and reason about how it can be worn. Capture decision-relevant visual details without writing an essay, repeating information across fields, or adding generic filler. Use only what the images support, ignore the background and presentation surface, and be explicit about meaningful uncertainty.

FIELD RESPONSIBILITIES

name: Write a short, human-readable identifier that distinguishes the garment at a glance. Use its most recognisable type and features. Do not invent a brand.

description: In one or two compact sentences, describe the garment's overall visual character and the distinguishing details not adequately represented elsewhere. Include relevant construction, shape, pattern, graphics, texture, finish, design features, alterations, or visible condition when they materially affect its appearance or use. Clearly separate observed facts from uncertain interpretations.

category: Select exactly one controlled category: ${detailedCategoryValues.join(", ")}. Keep construction, colour, material, fit, condition, and aesthetic style out of this field.

primaryColor: Record the dominant visible garment colour. Do not use colours from lighting, shadows, the background, hanger, or presentation surface.

secondaryColors: Record only clearly visible, meaningful garment colours beyond the primary colour. Do not include minor photographic colour casts.

material: Record the visible or strongly supported fabric or material. Use null when the images do not support a useful conclusion, and put any meaningful uncertainty in confidence.

fit: Describe the garment's visible cut or silhouette, not how it fits an unseen wearer. Use null when the shape cannot be judged reliably.

styleTags: Return a small set of specific, non-duplicative aesthetic descriptors that would help compare this garment with the rest of a wardrobe. Reuse an existing tag when it represents the same concept, using its exact supplied spelling. Never create capitalization, pluralization, or trivial wording variants. Create a new tag only when it is genuinely distinct, useful across multiple garments, and no more than five tags total. Do not repeat its category, colours, material, fit, seasons, formality, or visible condition as style tags. Do not turn an uncertain interpretation into a definitive style tag.

seasons: List only seasons reasonably supported by the garment's coverage, construction, and apparent material. Do not infer climate or personal preference.

formality: Select exactly one practical level: ${formalityValues.join(", ")}. Do not list occasions or repeat style tags.

confidence: Add entries for important fields where the image evidence is limited or ambiguous. Use stable field names such as category, primaryColor, material, fit, seasons, formality, or styleTags. Keep each note brief and specific. Use an empty note when no clarification is needed. Do not combine materially different interpretations with slashes or vague alternatives when a confidence note would preserve the uncertainty more clearly.${vocabulary}`;
}
