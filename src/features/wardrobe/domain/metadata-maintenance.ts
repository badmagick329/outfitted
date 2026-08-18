import {
  categoryGroupForCategory,
  detailedCategorySchema,
  detailedCategoryValues,
  formalityValues,
} from "./category-groups";
import { metadataKey, normalizeGarmentMetadata } from "./metadata";

function controlledValue(value: string | null, choices: readonly string[]) {
  const key = metadataKey(value);
  return choices.find((choice) => metadataKey(choice) === key) ?? value;
}

export function normalizeExistingWardrobeMetadata<
  T extends {
    userId: string;
    name: string;
    description: string | null;
    category: string | null;
    primaryColor: string | null;
    secondaryColors: string[];
    material: string | null;
    fit: string | null;
    styleTags: string[];
    seasons: string[];
    formality: string | null;
  },
>(items: T[]) {
  const styleTagsByUser = new Map<string, string[]>();
  return items.map((item) => {
    const established = styleTagsByUser.get(item.userId) ?? [];
    const normalized = normalizeGarmentMetadata(item, { styleTags: established });
    styleTagsByUser.set(item.userId, [...established, ...normalized.styleTags]);
    const category = controlledValue(normalized.category, detailedCategoryValues);
    const controlledCategory = detailedCategorySchema.safeParse(category);
    return {
      ...normalized,
      category,
      ...(controlledCategory.success
        ? { categoryGroup: categoryGroupForCategory(controlledCategory.data) }
        : {}),
      formality: controlledValue(normalized.formality, formalityValues),
    };
  });
}
