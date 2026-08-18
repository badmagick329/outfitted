import type { CategoryGroup } from "./category-groups";

export type VocabularyEntry = { value: string; count: number };
export type MetadataVocabulary = {
  styleTags?: string[];
  categories?: string[];
  colors?: string[];
  materials?: string[];
  fits?: string[];
  seasons?: string[];
};

export function normalizeMetadataText(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized || null;
}

export function metadataKey(value: string | null | undefined) {
  return normalizeMetadataText(value)?.toLocaleLowerCase() ?? "";
}

export function normalizeMetadataList(
  values: Array<string | null | undefined>,
  established: string[] = [],
) {
  const canonical = new Map(
    established.map((value) => [metadataKey(value), normalizeMetadataText(value)!]),
  );
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const normalized = normalizeMetadataText(value);
    const key = metadataKey(normalized);
    if (!normalized || seen.has(key)) return [];
    seen.add(key);
    return [canonical.get(key) ?? normalized];
  });
}

export function establishedVocabulary(values: Array<string | null | undefined>) {
  return normalizeMetadataList(values);
}

export function styleTagVocabulary(items: Array<{ styleTags: string[] }>): VocabularyEntry[] {
  const entries = new Map<string, VocabularyEntry>();
  for (const item of items)
    for (const tag of normalizeMetadataList(item.styleTags)) {
      const key = metadataKey(tag);
      const current = entries.get(key);
      if (current) current.count += 1;
      else entries.set(key, { value: tag, count: 1 });
    }
  return [...entries.values()].sort(
    (left, right) => right.count - left.count || left.value.localeCompare(right.value),
  );
}

export type NormalizableGarmentMetadata = {
  name?: string;
  description?: string | null;
  category?: string | null;
  primaryColor?: string | null;
  secondaryColors?: string[];
  material?: string | null;
  fit?: string | null;
  styleTags?: string[];
  seasons?: string[];
  formality?: string | null;
  categoryGroup?: CategoryGroup | null;
};

export function normalizeGarmentMetadata<T extends NormalizableGarmentMetadata>(
  metadata: T,
  vocabulary: MetadataVocabulary = {},
): T {
  return {
    ...metadata,
    ...(metadata.name !== undefined ? { name: normalizeMetadataText(metadata.name) ?? "" } : {}),
    ...(metadata.description !== undefined
      ? { description: normalizeMetadataText(metadata.description) }
      : {}),
    ...(metadata.category !== undefined
      ? { category: normalizeMetadataText(metadata.category) }
      : {}),
    ...(metadata.primaryColor !== undefined
      ? { primaryColor: normalizeMetadataText(metadata.primaryColor) }
      : {}),
    ...(metadata.material !== undefined
      ? { material: normalizeMetadataText(metadata.material) }
      : {}),
    ...(metadata.fit !== undefined ? { fit: normalizeMetadataText(metadata.fit) } : {}),
    ...(metadata.formality !== undefined
      ? { formality: normalizeMetadataText(metadata.formality) }
      : {}),
    ...(metadata.secondaryColors !== undefined
      ? { secondaryColors: normalizeMetadataList(metadata.secondaryColors, vocabulary.colors) }
      : {}),
    ...(metadata.styleTags !== undefined
      ? { styleTags: normalizeMetadataList(metadata.styleTags, vocabulary.styleTags) }
      : {}),
    ...(metadata.seasons !== undefined
      ? { seasons: normalizeMetadataList(metadata.seasons, vocabulary.seasons) }
      : {}),
  } as T;
}
