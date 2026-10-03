"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { demoTags, demoWardrobe, type DemoGarment, type DemoTag } from "@/components/demo-wardrobe";
import {
  quickCategoryGroupOptions,
  type CategoryGroup,
} from "@/features/wardrobe/domain/category-groups";

// Same rule as the real wardrobe: one section at a time, and any selected style tag matches.
function matches(garment: DemoGarment, section: CategoryGroup | null, tags: DemoTag[]) {
  if (section && garment.section !== section) return false;
  return !tags.length || tags.some((tag) => garment.tags.includes(tag));
}

const chipClassName =
  "rounded-full border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry";

function GarmentCard({ garment }: { garment: DemoGarment }) {
  return (
    <figure>
      <div
        className={`overflow-hidden rounded-xl border-2 border-ink shadow-[3px_3px_0_var(--color-ink)] ${garment.tint}`}
      >
        <Image
          src={garment.image}
          alt={garment.name}
          className="aspect-[4/5] w-full object-cover"
          sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 170px"
        />
      </div>
      <figcaption className="mt-2">
        <span className="block text-xs font-bold leading-tight sm:text-sm">{garment.name}</span>
        <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink/50 sm:text-[10px]">
          {garment.category}
        </span>
      </figcaption>
    </figure>
  );
}

const gridClassName = "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6";

function useMeasuredHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

export function WardrobeFilterDemo() {
  const [section, setSection] = useState<CategoryGroup | null>(null);
  const [tags, setTags] = useState<DemoTag[]>([]);
  const visible = demoWardrobe.filter((garment) => matches(garment, section, tags));
  const filtered = section !== null || tags.length > 0;
  const [gridRef, gridHeight] = useMeasuredHeight();

  function toggleTag(tag: DemoTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="rounded-[2rem] border-2 border-ink bg-canvas p-4 shadow-[8px_8px_0_var(--color-teal)] sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
              Sample wardrobe
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-[-0.03em]">Try the filters</h3>
          </div>
          <p
            className="rounded-full border-2 border-ink bg-teal px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-canvas"
            aria-live="polite"
          >
            {visible.length} of {demoWardrobe.length} pieces
          </p>
        </div>

        <nav className="mt-5" aria-label="Filter the sample wardrobe">
          <div className="flex flex-wrap gap-2">
            {[{ value: null, label: "All" }, ...quickCategoryGroupOptions].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={section === option.value}
                onClick={() => setSection(option.value)}
                className={`${chipClassName} ${section === option.value ? "border-teal bg-teal text-canvas" : "border-line bg-canvas text-ink/65 hover:border-teal"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
              Style tags
            </span>
            {demoTags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className={`${chipClassName} ${tags.includes(tag) ? "border-ink bg-citrus text-ink" : "border-line bg-mist/60 text-ink/65 hover:border-ink"}`}
              >
                {tag}
              </button>
            ))}
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setSection(null);
                  setTags([]);
                }}
                className="ml-auto text-sm font-bold text-teal underline decoration-teal/40 decoration-2 underline-offset-4 transition hover:text-teal-dark"
              >
                Clear filters
              </button>
            )}
          </div>
        </nav>

        {/* The frame eases to the grid's measured height, so filtering never snaps the page. */}
        <motion.div
          className="-m-2 mt-4 overflow-hidden"
          animate={{ height: gridHeight }}
          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
        >
          <div ref={gridRef} className="p-2">
            {visible.length ? (
              <ul className={`relative ${gridClassName}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((garment) => (
                    <motion.li
                      key={garment.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    >
                      <GarmentCard garment={garment} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div className="mx-auto my-4 max-w-sm rounded-2xl border-2 border-dashed border-teal/40 bg-mist p-6 text-center">
                <p className="text-lg font-bold tracking-[-0.03em]">Nothing matches that mix</p>
                <p className="mt-1 text-sm text-ink/60">
                  No piece in that section carries those tags. Loosen a filter to bring pieces back.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
