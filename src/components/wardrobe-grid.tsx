/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Images, Shirt } from "lucide-react";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import {
  quickCategoryGroupOptions,
  type CategoryGroup,
} from "@/features/wardrobe/domain/category-groups";
import {
  matchesWardrobeFilters,
  wardrobeScrollKey,
  wardrobeUrl,
  type WardrobeFacet,
  type WardrobeFilters,
} from "@/features/wardrobe/domain/filters";

export type WardrobeGridItem = {
  id: string;
  name: string;
  category: string | null;
  categoryGroup: string | null;
  styleTags: string[];
  analysisStatus: string;
  coverPhotoId: string | null;
  photoCount: number;
};

export function WardrobeGrid({
  items,
  filters: initialFilters,
  facets,
}: {
  items: WardrobeGridItem[];
  filters: WardrobeFilters;
  facets: { categories: WardrobeFacet[]; tags: WardrobeFacet[] };
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [open, setOpen] = useState(false);
  const currentUrl = wardrobeUrl(filters);
  const shown = items.filter((item) => matchesWardrobeFilters(item, filters));
  const detailedFilterCount = filters.categories.length + filters.tags.length;
  const hasActiveFilters = filters.section !== null || detailedFilterCount > 0;
  const sectionLabel = quickCategoryGroupOptions.find(
    (option) => option.value === filters.section,
  )?.label;
  useLayoutEffect(() => {
    const value = sessionStorage.getItem(wardrobeScrollKey(currentUrl));
    const scroll = Number(value);
    if (Number.isFinite(scroll) && scroll >= 0)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.scrollTo(0, scroll);
          sessionStorage.removeItem(wardrobeScrollKey(currentUrl));
        }),
      );
  }, [currentUrl]);
  function update(next: WardrobeFilters) {
    setFilters(next);
    router.replace(wardrobeUrl(next), { scroll: false });
  }
  function toggle(group: "categories" | "tags", value: string) {
    const current = filters[group];
    update({
      ...filters,
      [group]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  }
  function facetAccessibleLabel(facet: WardrobeFacet) {
    return `${facet.label}, ${facet.count} ${facet.count === 1 ? "garment" : "garments"}`;
  }
  return (
    <>
      <nav className="mt-7" aria-label="Filter wardrobe">
        <div className="flex flex-wrap gap-2">
          {[
            { value: null, label: "All" } as { value: CategoryGroup | null; label: string },
            ...quickCategoryGroupOptions,
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={filters.section === option.value}
              onClick={() => update({ ...filters, section: option.value })}
              className={`rounded-full border px-3 py-2 text-sm font-bold ${filters.section === option.value ? "border-teal bg-teal text-canvas" : "border-line bg-canvas text-ink/65"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-teal/30 bg-mist px-3 py-2 text-sm font-bold text-teal transition hover:border-teal"
          >
            Filters{detailedFilterCount ? ` (${detailedFilterCount})` : ""}
          </button>
        </div>
        {open && (
          <section className="mt-4 rounded-2xl border border-line bg-mist/50 p-4">
            <div className="flex items-center justify-between">
              <strong>Filters</strong>
              <button
                type="button"
                disabled={!hasActiveFilters}
                className={`text-sm font-bold transition ${hasActiveFilters ? "text-teal hover:text-teal-dark" : "cursor-not-allowed text-ink/35"}`}
                onClick={() => update({ section: null, categories: [], tags: [] })}
              >
                Clear filters
              </button>
            </div>
            {sectionLabel && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2 text-sm">
                <span>Filtering within {sectionLabel}</span>
                <button
                  type="button"
                  className="shrink-0 font-bold text-teal"
                  onClick={() => update({ ...filters, section: null })}
                >
                  Show all
                </button>
              </div>
            )}
            {facets.categories.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-bold">Category</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets.categories.map((facet) => (
                    <label
                      key={facet.value}
                      className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm"
                    >
                      <input
                        className="mr-1.5"
                        type="checkbox"
                        aria-label={facetAccessibleLabel(facet)}
                        checked={filters.categories.includes(facet.value)}
                        onChange={() => toggle("categories", facet.value)}
                      />
                      {facet.label}
                      <span
                        aria-hidden="true"
                        className="ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-ink/8 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-ink/60"
                      >
                        {facet.count}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {facets.tags.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-bold">Style</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets.tags.map((facet) => (
                    <label
                      key={facet.value}
                      className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm"
                    >
                      <input
                        className="mr-1.5"
                        type="checkbox"
                        aria-label={facetAccessibleLabel(facet)}
                        checked={filters.tags.includes(facet.value)}
                        onChange={() => toggle("tags", facet.value)}
                      />
                      {facet.label}
                      <span
                        aria-hidden="true"
                        className="ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-ink/8 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-ink/60"
                      >
                        {facet.count}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>
        )}
      </nav>
      {shown.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((item) => {
            const status = ["failed", "pending", "processing"].includes(item.analysisStatus)
              ? (item.analysisStatus as MemberStatus)
              : null;
            const href = `/items/${item.id}?returnTo=${encodeURIComponent(currentUrl)}`;
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() =>
                  sessionStorage.setItem(wardrobeScrollKey(currentUrl), String(window.scrollY))
                }
                aria-label={`Open ${item.name || item.category || "garment"}`}
                className="group block overflow-hidden rounded-2xl border border-line bg-canvas"
              >
                <div className="relative">
                  {item.coverPhotoId ? (
                    <img
                      src={`/api/photos/${item.coverPhotoId}?variant=thumbnail`}
                      alt={item.name || item.category || "Garment"}
                      loading="lazy"
                      className="aspect-[4/5] w-full bg-mist object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/5] place-items-center bg-mist">
                      <Shirt size={36} />
                    </div>
                  )}
                  {item.photoCount > 1 && (
                    <span
                      aria-label={`${item.photoCount} photos`}
                      className="absolute left-2 top-2 rounded-full bg-ink/75 px-2 py-1 text-xs font-bold text-canvas"
                    >
                      <Images className="mr-1 inline" size={12} />
                      {item.photoCount}
                    </span>
                  )}
                  {status && (
                    <span className="absolute right-2 top-2">
                      <MemberStatusBadge status={status} compact />
                    </span>
                  )}
                </div>
                {(item.name || item.category) && (
                  <div className="p-3">
                    <strong className="line-clamp-2 block text-sm">{item.name}</strong>
                    {item.category && (
                      <span className="mt-1 block truncate text-xs text-ink/60">
                        {item.category}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-teal/35 bg-mist/65 p-7">
          <h2 className="text-xl font-bold">No garments match these filters</h2>
          <button
            type="button"
            className="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-bold text-canvas"
            onClick={() => update({ section: null, categories: [], tags: [] })}
          >
            Clear filters
          </button>
        </section>
      )}
    </>
  );
}
