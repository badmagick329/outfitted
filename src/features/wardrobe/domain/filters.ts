import { categoryGroupSchema, resolveCategoryGroup, type CategoryGroup } from "./category-groups";
import { metadataKey, normalizeMetadataList, normalizeMetadataText } from "./metadata";

export type WardrobeFilters = {
  section: CategoryGroup | null;
  categories: string[];
  tags: string[];
};
export type WardrobeFacet = { value: string; label: string; count: number };
type Query = Record<string, string | string[] | undefined>;
export const normalizeFacet = normalizeMetadataText;
function key(value: string) {
  return metadataKey(value);
}
function values(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).flatMap(
    (entry) => normalizeFacet(entry) ?? [],
  );
}
function options(input: Array<Array<string | null | undefined>>): WardrobeFacet[] {
  const facets = new Map<string, WardrobeFacet>();
  for (const values of input) {
    for (const label of normalizeMetadataList(values)) {
      const value = key(label);
      const facet = facets.get(value);
      if (facet) facet.count += 1;
      else facets.set(value, { value, label, count: 1 });
    }
  }
  return [...facets.values()].sort((a, b) => a.label.localeCompare(b.label));
}
export function wardrobeFacets(items: Array<{ category: string | null; styleTags: string[] }>) {
  return {
    categories: options(items.map((item) => [item.category])),
    tags: options(items.map((item) => item.styleTags)),
  };
}
export function parseWardrobeFilters(
  query: Query,
  facets: ReturnType<typeof wardrobeFacets>,
): WardrobeFilters {
  const section = categoryGroupSchema.safeParse(
    Array.isArray(query.section) ? query.section[0] : query.section,
  );
  const categories = new Set(facets.categories.map((facet) => facet.value));
  const tags = new Set(facets.tags.map((facet) => facet.value));
  return {
    section: section.success ? section.data : null,
    categories: values(query.category).filter((value) => categories.has(key(value))),
    tags: values(query.tag).filter((value) => tags.has(key(value))),
  };
}
export function parseWardrobeReturnTo(returnTo: string, facets: ReturnType<typeof wardrobeFacets>) {
  const url = new URL(returnTo, "https://outfitted.invalid");
  const query: Query = {};
  for (const [name, value] of url.searchParams) {
    const current = query[name];
    query[name] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  }
  return parseWardrobeFilters(query, facets);
}
export function serializeWardrobeFilters(filters: WardrobeFilters) {
  const params = new URLSearchParams();
  if (filters.section) params.set("section", filters.section);
  [...filters.categories]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .forEach((value) => params.append("category", value));
  [...filters.tags]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .forEach((value) => params.append("tag", value));
  return params.toString();
}
export function matchesWardrobeFilters(
  item: { category: string | null; categoryGroup: string | null; styleTags: string[] },
  filters: WardrobeFilters,
) {
  if (
    filters.section &&
    resolveCategoryGroup(item.categoryGroup, item.category) !== filters.section
  )
    return false;
  if (
    filters.categories.length &&
    !filters.categories.some((value) => key(value) === key(item.category ?? ""))
  )
    return false;
  return (
    !filters.tags.length ||
    filters.tags.some((value) => item.styleTags.some((tag) => key(tag) === key(value)))
  );
}
export function filterWardrobeItems<
  T extends {
    category: string | null;
    categoryGroup: string | null;
    styleTags: string[];
  },
>(items: T[], filters: WardrobeFilters) {
  return items.filter((item) => matchesWardrobeFilters(item, filters));
}
export function wardrobeItemNavigation<T extends { id: string }>(
  items: T[],
  currentItemId: string,
) {
  const index = items.findIndex((item) => item.id === currentItemId);
  if (index < 0) return null;
  return {
    index,
    total: items.length,
    previousItemId: items[index - 1]?.id ?? null,
    nextItemId: items[index + 1]?.id ?? null,
  };
}
export function wardrobeUrl(filters: WardrobeFilters) {
  const query = serializeWardrobeFilters(filters);
  return query ? `/wardrobe?${query}` : "/wardrobe";
}
export function validatedWardrobeReturnTo(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/wardrobe";
  try {
    const url = new URL(value, "https://outfitted.invalid");
    if (url.origin !== "https://outfitted.invalid" || url.pathname !== "/wardrobe" || url.hash)
      return "/wardrobe";
    const allowed = new URLSearchParams();
    for (const [name, parameter] of url.searchParams)
      if (["section", "category", "tag"].includes(name)) allowed.append(name, parameter);
    return allowed.toString() === url.searchParams.toString()
      ? `/wardrobe${allowed.size ? `?${allowed}` : ""}`
      : "/wardrobe";
  } catch {
    return "/wardrobe";
  }
}
export function wardrobeScrollKey(url: string) {
  return `wardrobe-scroll:${url}`;
}
