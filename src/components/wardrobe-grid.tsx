"use client";

/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shirt } from "lucide-react";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import {
  categoryGroupOptions,
  resolveCategoryGroup,
  type CategoryGroup,
  type WardrobeFilter,
} from "@/features/wardrobe/domain/category-groups";

export type WardrobeGridItem = {
  id: string;
  name: string;
  category: string | null;
  categoryGroup: string | null;
  analysisStatus: string;
  coverPhotoId: string | null;
};

function itemGroup(item: WardrobeGridItem) {
  return resolveCategoryGroup(item.categoryGroup, item.category);
}

function WardrobeCard({
  item,
  activeFilter,
}: {
  item: WardrobeGridItem;
  activeFilter: WardrobeFilter;
}) {
  const status = ["failed", "pending", "processing"].includes(item.analysisStatus)
    ? (item.analysisStatus as MemberStatus)
    : null;
  const hasVisibleDetails = Boolean(item.name || item.category);
  const accessibleName = item.name || item.category || "garment";
  const href =
    activeFilter === "all"
      ? `/items/${item.id}`
      : `/items/${item.id}?fromCategory=${encodeURIComponent(activeFilter)}`;

  return (
    <Link
      href={href}
      aria-label={`Open ${accessibleName}${item.name && item.category ? `, ${item.category}` : ""}`}
      className="group block h-full overflow-hidden rounded-2xl border border-line bg-canvas transition hover:-translate-y-1 hover:border-teal hover:shadow-[5px_5px_0_var(--color-peach)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
    >
      <div className="relative">
        {item.coverPhotoId ? (
          <img
            src={`/api/photos/${item.coverPhotoId}?variant=thumbnail`}
            alt={item.name || item.category || "Garment"}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid aspect-[4/5] place-items-center bg-mist text-teal/45">
            <Shirt size={36} aria-hidden="true" />
          </div>
        )}
        {status && (
          <span className="absolute right-2 top-2">
            <MemberStatusBadge status={status} compact />
          </span>
        )}
      </div>
      {hasVisibleDetails && (
        <div className="min-w-0 p-3 sm:p-4">
          {item.name && (
            <strong className="line-clamp-2 block break-words text-sm leading-tight sm:text-base">
              {item.name}
            </strong>
          )}
          {item.category && (
            <span
              className={`${item.name ? "mt-1" : ""} block truncate text-xs text-ink/60 sm:text-sm`}
            >
              {item.category}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export function WardrobeGrid({
  items,
  initialFilter,
}: {
  items: WardrobeGridItem[];
  initialFilter: WardrobeFilter;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  const groupCounts = useMemo(() => {
    const counts = new Map<CategoryGroup, number>();
    for (const item of items) {
      const group = itemGroup(item);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const visibleOptions = categoryGroupOptions.filter(
    ({ value }) => (groupCounts.get(value) ?? 0) > 0 || value === activeFilter,
  );
  const filteredItems =
    activeFilter === "all" ? items : items.filter((item) => itemGroup(item) === activeFilter);

  function selectFilter(filter: WardrobeFilter) {
    setActiveFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter === "all") params.delete("category");
    else params.set("category", filter);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const activeLabel = categoryGroupOptions.find(({ value }) => value === activeFilter)?.label;

  return (
    <>
      <nav className="mt-7 flex items-center gap-3" aria-label="Filter wardrobe by category">
        <div className="-mx-5 min-w-0 flex-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex w-max items-center gap-2">
            <button
              type="button"
              aria-pressed={activeFilter === "all"}
              onClick={() => selectFilter("all")}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
                activeFilter === "all"
                  ? "border-teal bg-teal text-canvas"
                  : "border-line bg-canvas text-ink/65 hover:border-teal hover:text-teal"
              }`}
            >
              All
            </button>
            {visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={activeFilter === option.value}
                onClick={() => selectFilter(option.value)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
                  activeFilter === option.value
                    ? "border-teal bg-teal text-canvas"
                    : "border-line bg-canvas text-ink/65 hover:border-teal hover:text-teal"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-ink/50 sm:text-sm" aria-live="polite">
          {activeFilter === "all"
            ? `${items.length} ${items.length === 1 ? "piece" : "pieces"}`
            : `${filteredItems.length} of ${items.length}`}
        </span>
      </nav>

      {filteredItems.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <WardrobeCard key={item.id} item={item} activeFilter={activeFilter} />
          ))}
        </div>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-teal/35 bg-mist/65 p-7 sm:p-9">
          <h2 className="text-xl font-bold tracking-[-0.03em]">
            No {activeLabel?.toLowerCase() ?? "matching garments"} here
          </h2>
          <button
            type="button"
            onClick={() => selectFilter("all")}
            className="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-bold text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          >
            Show all garments
          </button>
        </section>
      )}
    </>
  );
}
