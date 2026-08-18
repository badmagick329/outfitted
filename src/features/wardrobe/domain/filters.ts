import { categoryGroupSchema, resolveCategoryGroup, type CategoryGroup } from "./category-groups";

export type WardrobeFilters = {
  section: CategoryGroup | null;
  categories: string[];
  tags: string[];
};
export type WardrobeFacet = { value: string; label: string };
type Query = Record<string, string | string[] | undefined>;
export function normalizeFacet(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
function key(value: string) {
  return normalizeFacet(value).toLocaleLowerCase();
}
function values(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).map(normalizeFacet).filter(Boolean);
}
function options(input: Array<string | null | undefined>): WardrobeFacet[] {
  const found = new Map<string, string>();
  for (const value of input) if (value && key(value)) found.set(key(value), normalizeFacet(value));
  return [...found]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}
export function wardrobeFacets(items: Array<{ category: string | null; styleTags: string[] }>) {
  return {
    categories: options(items.map((item) => item.category)),
    tags: options(items.flatMap((item) => item.styleTags)),
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
