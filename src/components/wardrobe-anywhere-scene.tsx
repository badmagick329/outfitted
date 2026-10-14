"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { Check } from "lucide-react";
import { useReducedMotionPreference } from "@/components/demo-playback";
import { demoWardrobe, type DemoGarment } from "@/components/demo-wardrobe";
import {
  quickCategoryGroupOptions,
  type CategoryGroup,
} from "@/features/wardrobe/domain/category-groups";
import { wardrobeFacets } from "@/features/wardrobe/domain/filters";

/*
 * Scroll-driven: a tall track pins the phone while the page scrolls, and each step owns an equal
 * slice of the track. Steps change discretely and animate on their own clock, so a fast or slow
 * scroll never leaves the phone half-drawn. The scene runs the shopping check twice, once per
 * outcome: a yellow knit the member already owns (Tops, then the Sweater category, whose count
 * says how many) and a navy blazer that fills a gap (Outerwear, whose Category facets have no
 * Blazer). It uses only the wardrobe's real filters, laid out like `wardrobe-grid.tsx`; the app
 * has no text search.
 *
 * Reduced motion drops the pinning in CSS, so layout never waits on hydration, and shows the
 * final step (the gap) with every caption listed.
 */

// The real panel's facets: only values the wardrobe holds, counted across the whole wardrobe.
const facets = wardrobeFacets(
  demoWardrobe.map((garment) => ({ category: garment.category, styleTags: [...garment.tags] })),
);
const SWEATER = "Sweater";
const DUPLICATE_ID = "citrus-knit";

const tops = demoWardrobe.filter((garment) => garment.section === "tops");
const sweaters = tops.filter((garment) => garment.category === SWEATER);
const outerwear = demoWardrobe.filter((garment) => garment.section === "outerwear");

// "2 coats, 1 jacket and 1 overshirt", from the outerwear the sample member owns.
const outerwearSummary = (() => {
  const counts = new Map<string, number>();
  for (const { category } of outerwear) counts.set(category, (counts.get(category) ?? 0) + 1);
  const parts = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `${count} ${category.toLowerCase()}${count === 1 ? "" : "s"}`);
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
})();

type Step = {
  title: string;
  body: string;
  shop: ShopItem;
  section: CategoryGroup | null;
  panelOpen: boolean;
  category: string | null;
  outcome: "owned" | "gap" | null;
};

const knit = { name: "Chunky knit, yellow", swatch: "bg-citrus", stamp: "You own one" } as const;
const blazer = { name: "Blazer, navy", swatch: "bg-[#27324d]", stamp: "Fills a gap" } as const;
type ShopItem = typeof knit | typeof blazer;

const steps: Step[] = [
  {
    title: "Spot a yellow knit",
    body: `A chunky knit catches your eye. Your phone holds all ${demoWardrobe.length} garments you own.`,
    shop: knit,
    section: null,
    panelOpen: false,
    category: null,
    outcome: null,
  },
  {
    title: "Tap Tops",
    body: `The wardrobe narrows to your ${tops.length} tops.`,
    shop: knit,
    section: "tops",
    panelOpen: false,
    category: null,
    outcome: null,
  },
  {
    title: "Tick Sweater",
    body: `Filters count every category. Sweater says ${sweaters.length}, and ticking it shows them.`,
    shop: knit,
    section: "tops",
    panelOpen: true,
    category: SWEATER,
    outcome: null,
  },
  {
    title: "It's already yours",
    body: "The citrus knit is hanging at home. This one can stay on the rail.",
    shop: knit,
    section: "tops",
    panelOpen: true,
    category: SWEATER,
    outcome: "owned",
  },
  {
    title: "Next, a navy blazer",
    body: `Tap Outerwear: you own ${outerwearSummary}.`,
    shop: blazer,
    section: "outerwear",
    panelOpen: false,
    category: null,
    outcome: null,
  },
  {
    title: "No blazer at home",
    body: "Category lists only what you own, and Blazer isn't there. This one fills a gap.",
    shop: blazer,
    section: "outerwear",
    panelOpen: true,
    category: null,
    outcome: "gap",
  },
];
const LAST_STEP = steps.length - 1;

const spring = { type: "spring", bounce: 0.2, duration: 0.55 } as const;
const tiny = "text-[length:max(9px,3.4cqw)]";
const chip = `rounded-full border px-[2.6cqw] py-[1.4cqw] font-bold leading-none ${tiny}`;
const facetChip = `inline-flex shrink-0 items-center gap-[1.2cqw] rounded-full border px-[2cqw] py-[1.2cqw] leading-none ${tiny}`;

function shownGarments({ section, category }: Step): readonly DemoGarment[] {
  return demoWardrobe.filter(
    (garment) =>
      (section === null || garment.section === section) &&
      (category === null || garment.category === category),
  );
}

export function WardrobeAnywhereScene() {
  const track = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotionPreference();
  const [scrolledStep, setScrolledStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (progress) =>
    setScrolledStep(Math.min(LAST_STEP, Math.max(0, Math.floor(progress * steps.length)))),
  );
  const step = reducedMotion ? LAST_STEP : scrolledStep;
  const current = steps[step];
  const garments = shownGarments(current);

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      {/* About 55svh of scroll per step: the track's travel is its height minus one screen. */}
      <div ref={track} className="relative h-[430svh] motion-reduce:h-auto">
        <div className="sticky top-0 flex h-svh items-center motion-reduce:static motion-reduce:h-auto motion-reduce:py-12">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-5 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:px-10">
            <ol className="grid lg:gap-2">
              {steps.map((item, index) => {
                const active = index === step;
                return (
                  <li
                    key={item.title}
                    aria-current={active ? "step" : undefined}
                    className={`flex gap-4 rounded-2xl border-2 p-3 transition duration-300 motion-reduce:opacity-100 ${active ? "border-ink bg-canvas shadow-[4px_4px_0_var(--color-ink)]" : "border-transparent opacity-45 max-lg:motion-safe:pointer-events-none max-lg:motion-safe:opacity-0"} max-lg:motion-safe:[grid-area:1/1]`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-xs font-bold ${active ? "bg-berry text-canvas" : "bg-canvas"}`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <strong className="block text-lg leading-tight tracking-[-0.03em]">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-sm leading-6 text-ink/65">{item.body}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="relative mx-auto">
              <ShopTag item={current.shop} stamped={current.outcome !== null} />
              <div
                role="img"
                aria-label={`Phone showing the sample wardrobe at step ${step + 1}: ${current.title}.`}
                className="@container relative aspect-[9/19] h-[min(600px,calc(100svh-12rem))] motion-reduce:h-[min(600px,80svh)] lg:h-[min(640px,calc(100svh-7rem))]"
              >
                <div className="size-full rounded-[13cqw] border-2 border-ink bg-ink p-[2.4cqw] shadow-[10px_10px_0_var(--color-citrus)]">
                  <div className="relative flex size-full flex-col overflow-hidden rounded-[10.5cqw] bg-canvas">
                    <div className="flex items-center justify-between px-[7cqw] pt-[3.2cqw] font-mono text-[length:max(8px,3.2cqw)] font-bold">
                      <span>9:41</span>
                      <span className="h-[5.5cqw] w-[24cqw] rounded-full bg-ink" />
                      <span className="w-[6cqw]" />
                    </div>

                    <div className="px-[5cqw] pt-[5cqw]">
                      <div className="flex items-end justify-between gap-2">
                        <strong className="text-[length:max(15px,7.2cqw)] leading-none tracking-[-0.05em]">
                          Wardrobe
                        </strong>
                        <span className="font-mono text-[length:max(8px,3cqw)] font-bold uppercase tracking-[0.1em] text-ink/50">
                          {demoWardrobe.length} garments
                        </span>
                      </div>
                      <div className="mt-[4cqw] flex gap-[1.6cqw] overflow-hidden">
                        {[{ value: null, label: "All" }, ...quickCategoryGroupOptions].map(
                          (option) => {
                            const on = option.value === current.section;
                            return (
                              <span
                                key={option.label}
                                className={`shrink-0 transition-colors duration-300 ${chip} ${on ? "border-teal bg-teal text-canvas" : "border-line bg-canvas text-ink/65"}`}
                              >
                                {option.label}
                              </span>
                            );
                          },
                        )}
                      </div>
                      <div className="mt-[2.6cqw] border-t border-line pt-[2.6cqw]">
                        <span className={`inline-block border-teal/30 bg-mist text-teal ${chip}`}>
                          Filters{current.category ? " (1)" : ""}
                        </span>
                      </div>
                      <motion.div
                        className="overflow-hidden"
                        initial={false}
                        animate={
                          current.panelOpen
                            ? { height: "auto", opacity: 1 }
                            : { height: 0, opacity: 0 }
                        }
                      >
                        <div className="relative mt-[2.6cqw] rounded-[4cqw] border border-line bg-mist/50 p-[3cqw]">
                          <strong className={`block ${tiny}`}>Category</strong>
                          <div className="mt-[1.6cqw] flex flex-wrap gap-[1.4cqw]">
                            {facets.categories.map((facet) => (
                              <FacetChip
                                key={facet.value}
                                label={facet.label}
                                count={facet.count}
                                on={facet.label === current.category}
                              />
                            ))}
                          </div>
                          <strong className={`mt-[2.4cqw] block ${tiny}`}>Style</strong>
                          <div className="mt-[1.6cqw] flex gap-[1.4cqw] overflow-hidden">
                            {facets.tags.map((facet) => (
                              <FacetChip
                                key={facet.value}
                                label={facet.label}
                                count={facet.count}
                                on={false}
                              />
                            ))}
                          </div>
                          <motion.span
                            className={`absolute right-[3cqw] top-[2cqw] rounded-full border-2 border-ink bg-teal px-[2.6cqw] py-[1.6cqw] font-mono font-bold uppercase leading-none tracking-[0.08em] text-canvas ${tiny}`}
                            initial={false}
                            animate={
                              current.outcome === "gap"
                                ? { opacity: 1, scale: 1, rotate: 4 }
                                : { opacity: 0, scale: 0.6, rotate: 0 }
                            }
                            transition={{ ...spring, delay: current.outcome === "gap" ? 0.35 : 0 }}
                          >
                            No blazer
                          </motion.span>
                        </div>
                      </motion.div>
                    </div>

                    <ul className="relative mt-[3.5cqw] grid grid-cols-2 content-start gap-[2.6cqw] px-[5cqw]">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {garments.map((garment) => {
                          const isDuplicate = garment.id === DUPLICATE_ID;
                          const owned = current.outcome === "owned";
                          return (
                            <motion.li
                              key={garment.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: owned && !isDuplicate ? 0.35 : 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={`relative overflow-hidden rounded-[4cqw] border bg-canvas transition-[border-color,box-shadow] duration-300 ${owned && isDuplicate ? "z-10 border-berry shadow-[0_0_0_2px_var(--color-berry)]" : "border-line"}`}
                            >
                              <Image
                                src={garment.image}
                                alt=""
                                className={`aspect-[4/5] w-full object-cover ${garment.tint}`}
                                sizes="140px"
                              />
                              {isDuplicate && (
                                <motion.span
                                  className={`absolute left-[3cqw] top-[38cqw] rounded-full border-2 border-ink bg-citrus px-[2.6cqw] py-[1.6cqw] font-mono font-bold uppercase leading-none tracking-[0.08em] text-ink ${tiny}`}
                                  initial={false}
                                  animate={
                                    owned
                                      ? { opacity: 1, scale: 1, rotate: -6 }
                                      : { opacity: 0, scale: 0.6, rotate: 0 }
                                  }
                                  transition={{ ...spring, delay: owned ? 0.35 : 0 }}
                                >
                                  Already yours
                                </motion.span>
                              )}
                              <div className="p-[2.6cqw]">
                                <strong className={`line-clamp-1 block leading-tight ${tiny}`}>
                                  {garment.name}
                                </strong>
                                <span className="mt-[0.8cqw] block truncate text-[length:max(8px,3cqw)] text-ink/60">
                                  {garment.category}
                                </span>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function FacetChip({ label, count, on }: { label: string; count: number; on: boolean }) {
  return (
    <span
      className={`${facetChip} transition-colors duration-300 ${on ? "border-teal bg-canvas text-ink" : "border-line bg-canvas text-ink/65"}`}
    >
      <span
        className={`grid size-[3.4cqw] place-items-center rounded-[0.8cqw] border transition-colors duration-300 ${on ? "border-teal bg-teal text-canvas" : "border-ink/40"}`}
      >
        {on && <Check className="size-[2.6cqw]" strokeWidth={4} />}
      </span>
      {label}
      <span className="text-ink/50">{count}</span>
    </span>
  );
}

// A swing tag from the shop, built from page elements. It swaps when the second garment comes up,
// and its stamp names the outcome once the phone has answered.
function ShopTag({ item, stamped }: { item: ShopItem; stamped: boolean }) {
  const gap = item === blazer;
  return (
    <motion.div
      className="absolute -right-5 bottom-[5%] z-10 w-28 sm:-right-24 sm:bottom-[14%] sm:w-40 lg:-left-36 lg:right-auto lg:bottom-[22%]"
      initial={false}
      animate={{ rotate: stamped ? -4 : 8 }}
      aria-hidden="true"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.name}
          className="relative rounded-[1.1rem] border-2 border-ink bg-canvas p-3 pt-6 shadow-[5px_5px_0_var(--color-ink)]"
          initial={{ opacity: 0, y: -24, rotate: 10 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: 24, rotate: -10 }}
        >
          <span className="absolute left-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full border-2 border-ink bg-peach" />
          <div className={`h-12 rounded-lg border-2 border-ink ${item.swatch}`} />
          <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink/50">
            New in
          </p>
          <p className="text-sm font-bold leading-tight">{item.name}</p>
          <motion.span
            className={`absolute inset-x-1 top-1/3 grid -rotate-12 place-items-center whitespace-nowrap rounded-lg border-[3px] bg-canvas/85 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em] ${gap ? "border-teal text-teal" : "border-berry text-berry"}`}
            initial={false}
            animate={stamped ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.6 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.45, delay: stamped ? 0.6 : 0 }}
          >
            {item.stamp}
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
