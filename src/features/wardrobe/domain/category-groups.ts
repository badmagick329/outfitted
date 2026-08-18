import { z } from "zod";

export const categoryGroupValues = [
  "tops",
  "bottoms",
  "outerwear",
  "dresses-jumpsuits",
  "other",
] as const;

export const categoryGroupSchema = z.enum(categoryGroupValues);
export type CategoryGroup = z.infer<typeof categoryGroupSchema>;
export type WardrobeFilter = "all" | CategoryGroup;

export const categoryGroupOptions: Array<{ value: CategoryGroup; label: string }> = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "outerwear", label: "Outerwear" },
  { value: "dresses-jumpsuits", label: "Dresses & jumpsuits" },
  { value: "other", label: "Other" },
];

export const quickCategoryGroupOptions = categoryGroupOptions.filter(({ value }) =>
  ["tops", "bottoms", "outerwear"].includes(value),
);

export const detailedCategoryOptions = [
  ["T-shirt", "tops"],
  ["Tank top", "tops"],
  ["Polo shirt", "tops"],
  ["Shirt", "tops"],
  ["Blouse", "tops"],
  ["Top", "tops"],
  ["Sweater", "tops"],
  ["Cardigan", "tops"],
  ["Sweatshirt", "tops"],
  ["Hoodie", "tops"],
  ["Vest", "tops"],
  ["Jeans", "bottoms"],
  ["Trousers", "bottoms"],
  ["Chinos", "bottoms"],
  ["Joggers", "bottoms"],
  ["Leggings", "bottoms"],
  ["Shorts", "bottoms"],
  ["Skirt", "bottoms"],
  ["Jacket", "outerwear"],
  ["Coat", "outerwear"],
  ["Blazer", "outerwear"],
  ["Overshirt", "outerwear"],
  ["Gilet", "outerwear"],
  ["Dress", "dresses-jumpsuits"],
  ["Jumpsuit", "dresses-jumpsuits"],
  ["Playsuit", "dresses-jumpsuits"],
  ["Suit", "other"],
  ["Activewear", "other"],
  ["Sleepwear", "other"],
  ["Swimwear", "other"],
  ["Underwear", "other"],
  ["Other garment", "other"],
] as const satisfies ReadonlyArray<readonly [string, CategoryGroup]>;

export const detailedCategoryValues = detailedCategoryOptions.map(([value]) => value) as [
  string,
  ...string[],
];
export const detailedCategorySchema = z.enum(detailedCategoryValues);
export type DetailedCategory = z.infer<typeof detailedCategorySchema>;
export const formalityValues = [
  "Casual",
  "Smart casual",
  "Business casual",
  "Semi-formal",
  "Formal",
] as const;
export const formalitySchema = z.enum(formalityValues);
export type Formality = z.infer<typeof formalitySchema>;

export function categoryGroupForCategory(category: DetailedCategory): CategoryGroup {
  return detailedCategoryOptions.find(([value]) => value === category)![1];
}

const categoryMatchers: Array<{ group: CategoryGroup; pattern: RegExp }> = [
  {
    group: "outerwear",
    pattern:
      /\b(anoraks?|blazers?|bombers?|coats?|gilets?|jackets?|parkas?|raincoats?|shackets?|trenches?|windbreakers?)\b/,
  },
  {
    group: "dresses-jumpsuits",
    pattern: /\b(dress(es)?|dungarees?|jumpsuits?|overalls?|playsuits?|rompers?)\b/,
  },
  {
    group: "bottoms",
    pattern: /\b(chinos?|culottes?|jeans?|joggers?|leggings?|pants?|shorts?|skirts?|trousers?)\b/,
  },
  {
    group: "tops",
    pattern:
      /\b(blouses?|cardigans?|hoodies?|jumpers?|knitwear|mock[- ]necks?|overshirts?|polos?|pullovers?|shirts?|sweaters?|sweatshirts?|tank tops?|tees?|t-shirts?|tops?|turtlenecks?|vests?)\b/,
  },
];

export function inferCategoryGroup(category: string | null | undefined): CategoryGroup | null {
  const normalized = category?.trim().toLowerCase();
  if (!normalized) return null;
  return categoryMatchers.find(({ pattern }) => pattern.test(normalized))?.group ?? "other";
}

export function resolveCategoryGroup(
  categoryGroup: string | null | undefined,
  category: string | null | undefined,
): CategoryGroup {
  const parsed = categoryGroupSchema.safeParse(categoryGroup);
  return parsed.success ? parsed.data : (inferCategoryGroup(category) ?? "other");
}

export function parseWardrobeFilter(value: string | string[] | null | undefined): WardrobeFilter {
  const parsed = categoryGroupSchema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : "all";
}
