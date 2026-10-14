"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, type TargetAndTransition } from "motion/react";
import { Check } from "lucide-react";
import {
  DemoPauseButton,
  usePageVisible,
  useReducedMotionPreference,
} from "@/components/demo-playback";
import { demoGarment, demoWardrobe, type DemoGarment } from "@/components/demo-wardrobe";
import { categoryGroupOptions } from "@/features/wardrobe/domain/category-groups";

/*
 * The landing hero's "photo to shop check" loop: a garment is photographed, its details are read
 * and it is filed into the wardrobe; then a near-identical jacket turns up on a shop's swing tag,
 * and filtering to its section and category finds the one just filed. Ending on the hero's own
 * garment shows why photographing it was worth it. The phone scene further down runs the same
 * check on other garments and adds the gap outcome, so the two demos don't repeat each other.
 *
 * Every moving piece is absolutely positioned in percentages of a fixed-ratio stage and sized in
 * container units, so the loop scales like a video without shipping one. Text sizes carry px floors
 * so labels stay legible on phones; the layout leaves room for that growth.
 */

const phases = ["snap", "read", "file", "filed", "shop", "filter", "owned", "clear"] as const;
type Phase = (typeof phases)[number];

// One cycle is about 13.4 s; OUT-17 caps it at about 14 s.
const phaseDurations: Record<Phase, number> = {
  snap: 1300,
  read: 3000,
  file: 1200,
  filed: 1000,
  shop: 1500,
  filter: 2000,
  owned: 2800,
  clear: 600,
};

const phaseIndex = (phase: Phase) => phases.indexOf(phase);

// The stage is 57:65. Positions use stage-width percent horizontally and stage-height percent
// vertically, so vertical offsets derived from widths need converting.
const STAGE_HEIGHT_RATIO = 65 / 57;
const down = (widthPercent: number) => widthPercent / STAGE_HEIGHT_RATIO;
const TILE_ASPECT = 5 / 4;

type Frame = { left: number; top: number; width: number; rotate: number };

const heroFrame: Frame = { left: 7, top: 9, width: 54, rotate: -4 };
// Once the filters apply, the jacket is the only match and steps forward beside the shop tag.
const matchFrame: Frame = { left: 8, top: 24, width: 40, rotate: -2 };
const gridTilt = [-2, 1.5, -1, 2, -1.5, 1];

function gridFrame(slot: number): Frame {
  return {
    left: 9 + (slot % 3) * 28.5,
    top: 17 + Math.floor(slot / 3) * down(25 * TILE_ASPECT + 3.5),
    width: 25,
    rotate: gridTilt[slot],
  };
}

// The swing tag lands low over the full grid, then moves up beside the match.
const tagLanding: Frame = { left: 57, top: 56, width: 35, rotate: 6 };
const tagBeside: Frame = { left: 55, top: 30, width: 36, rotate: 3 };

function place(frame: Frame) {
  return {
    left: `${frame.left}%`,
    top: `${frame.top}%`,
    width: `${frame.width}%`,
    rotate: frame.rotate,
  };
}

const settle = { type: "spring", bounce: 0.22, duration: 0.8 } as const;
const fadeOut = { duration: 0.4 };

// Every pose sets every animated key: Motion animates a key that drops out of `animate` back to
// its `initial` value, which would fade or fling pieces mid-loop.
function pose(
  frame: Frame,
  opacity: number,
  transition: TargetAndTransition["transition"],
  scale = 1,
): TargetAndTransition {
  return { ...place(frame), opacity, scale, transition };
}

type Tile = { garment: DemoGarment; slot: number };

const tiles: Tile[] = [
  { garment: demoGarment("off-white-tee"), slot: 0 },
  { garment: demoGarment("teal-camp-shirt"), slot: 1 },
  { garment: demoGarment("stone-trousers"), slot: 2 },
  { garment: demoGarment("citrus-knit"), slot: 3 },
];
const jacket = demoGarment("berry-chore-jacket");
const JACKET_SLOT = 4;
const MORE_SLOT = 5;

// The filters the shop check applies, with the facet count the real panel would show.
const sectionLabel = categoryGroupOptions.find(({ value }) => value === jacket.section)!.label;
const categoryCount = demoWardrobe.filter(({ category }) => category === jacket.category).length;

function tileTarget(slot: number, phase: Phase): TargetAndTransition {
  switch (phase) {
    case "snap":
    case "read":
      return pose(gridFrame(slot), 0, { duration: 0 }, 0.85);
    case "file":
    case "filed":
    case "shop":
      return pose(gridFrame(slot), 1, { ...settle, delay: slot * 0.07 });
    case "filter":
    case "owned":
      // Filtered out: none of these is a jacket.
      return pose(gridFrame(slot), 0, { duration: 0.35, delay: slot * 0.04 }, 0.85);
    case "clear":
      return pose(gridFrame(slot), 0, fadeOut, 0.85);
  }
}

function jacketTarget(phase: Phase): TargetAndTransition {
  switch (phase) {
    case "snap":
      // Dropped onto the page like a fresh print: it lands from above, tilts and settles.
      return {
        left: `${heroFrame.left}%`,
        width: `${heroFrame.width}%`,
        top: [`${heroFrame.top - 7}%`, `${heroFrame.top}%`],
        rotate: [-11, heroFrame.rotate],
        scale: [1.1, 1],
        opacity: [0, 1],
        transition: {
          default: { type: "spring", bounce: 0.4, duration: 0.75 },
          opacity: { duration: 0.2 },
          left: { duration: 0 },
          width: { duration: 0 },
        },
      };
    case "read":
      return pose(heroFrame, 1, settle);
    case "file":
    case "filed":
    case "shop":
      return pose(gridFrame(JACKET_SLOT), 1, { ...settle, delay: 0.3 });
    case "filter":
    case "owned":
      return pose(matchFrame, 1, { ...settle, delay: 0.5 });
    case "clear":
      return pose(matchFrame, 0, fadeOut);
  }
}

function tagTarget(phase: Phase): TargetAndTransition {
  switch (phase) {
    case "shop":
      // Swings in from above like a tag on a hanger.
      return pose(tagLanding, 1, { type: "spring", bounce: 0.4, duration: 0.8 });
    case "filter":
      return pose(tagBeside, 1, { ...settle, delay: 0.3 });
    case "owned":
      return pose({ ...tagBeside, rotate: -4 }, 1, settle);
    case "clear":
      return pose(tagBeside, 0, fadeOut);
    default:
      return pose({ ...tagLanding, top: tagLanding.top - 8, rotate: 14 }, 0, { duration: 0 });
  }
}

const details = [
  { label: "Category", value: jacket.category },
  { label: "Colour", value: jacket.colour, swatch: "bg-berry" },
  { label: "Material", value: "Cotton canvas" },
  { label: "Style", value: jacket.tags.join(", ") },
];

const monoLabel =
  "font-mono text-[length:max(8px,1.55cqw)] font-bold uppercase tracking-[0.14em] leading-none";
const bodyText = "text-[length:max(11px,2.5cqw)] leading-snug";
const titleText = "text-[length:max(13px,3.3cqw)] font-bold leading-tight tracking-[-0.03em]";

const instantly = (target: TargetAndTransition): TargetAndTransition => ({
  ...target,
  transition: { duration: 0 },
});

export function PhotoToShopCheckLoop() {
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.3 });
  const reducedMotion = useReducedMotionPreference();
  const pageVisible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  const playing = !reducedMotion && !paused && inView && pageVisible;
  // Reduced motion shows the finished check as a still.
  const phase: Phase = reducedMotion ? "owned" : phases[index];
  const at = phaseIndex(phase);
  const fx = reducedMotion ? instantly : (target: TargetAndTransition) => target;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % phases.length),
      phaseDurations[phases[index]],
    );
    return () => clearTimeout(timer);
  }, [playing, index]);

  // The jacket is the sample wardrobe's newest garment, so the count lands on the full wardrobe.
  const garmentCount = at >= phaseIndex("filed") ? demoWardrobe.length : demoWardrobe.length - 1;
  const reading = phase === "read";
  const inWardrobe = at >= phaseIndex("file") && phase !== "clear";
  const filtered = phase === "filter" || phase === "owned";
  const owned = phase === "owned";

  return (
    <div ref={stage} className="@container relative mx-auto aspect-[57/65] w-full max-w-[570px]">
      <div
        role="img"
        aria-label={`Animated demo: a photo of a ${jacket.name.toLowerCase()} is read and filed in the wardrobe. Later a red chore jacket turns up in a shop, and filtering the wardrobe to ${sectionLabel} and ${jacket.category} shows you already own one.`}
        className="absolute inset-0"
      >
        <div className="absolute inset-x-[8%] top-[8%] h-[82%] rotate-2 rounded-[2rem] bg-citrus" />
        <div className="absolute inset-x-[4%] top-[4%] h-[84%] -rotate-2 rounded-[2rem] border-2 border-ink bg-mist" />

        <motion.div
          className="absolute left-[9%] top-[7.5%] z-10 flex w-[82%] items-center justify-between gap-3"
          initial={false}
          animate={fx(
            inWardrobe
              ? { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1 } }
              : { opacity: 0, y: -8, transition: { duration: 0.25 } },
          )}
        >
          <span className={titleText}>Wardrobe</span>
          <span
            className={`inline-flex items-center gap-[0.6em] rounded-full border-2 border-ink bg-teal px-[0.9em] py-[0.6em] text-canvas ${monoLabel}`}
          >
            <span className="relative inline-flex overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={garmentCount}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  {garmentCount}
                </motion.span>
              </AnimatePresence>
            </span>
            garments
          </span>
        </motion.div>

        <motion.div
          className="absolute z-0 aspect-[4/5] rounded-[2.2cqw] border-2 border-dashed border-ink/35"
          style={place(gridFrame(JACKET_SLOT))}
          initial={false}
          animate={fx({ opacity: phase === "file" ? 1 : 0, transition: { duration: 0.2 } })}
        />

        {tiles.map((tile) => (
          <motion.div
            key={tile.slot}
            className="absolute z-10"
            initial={false}
            animate={fx(tileTarget(tile.slot, phase))}
          >
            <div
              className={`aspect-[4/5] overflow-hidden rounded-[2.2cqw] border-2 border-ink shadow-[0.8cqw_0.8cqw_0_var(--color-ink)] ${tile.garment.tint}`}
            >
              <Image
                src={tile.garment.image}
                alt=""
                className="size-full object-cover"
                sizes="(max-width: 640px) 25vw, 145px"
              />
            </div>
          </motion.div>
        ))}

        <motion.div
          className="absolute z-10"
          initial={false}
          animate={fx(tileTarget(MORE_SLOT, phase))}
        >
          <div className="grid aspect-[4/5] place-items-center rounded-[2.2cqw] border-2 border-ink bg-ink text-canvas shadow-[0.8cqw_0.8cqw_0_var(--color-citrus)]">
            <span className="font-mono text-[length:max(11px,3.2cqw)] font-bold">
              +{demoWardrobe.length - tiles.length - 1}
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute z-20 w-[38%]"
          style={{ left: "57%", top: "30%" }}
          initial={false}
          animate={fx(
            reading
              ? { opacity: 1, y: 0, scale: 1, rotate: 3, transition: { ...settle, delay: 0.15 } }
              : { opacity: 0, y: 16, scale: 0.96, rotate: 3, transition: { duration: 0.3 } },
          )}
        >
          <div className="rounded-[2.2cqw] border-2 border-ink bg-canvas p-[max(10px,2.6cqw)] shadow-[1cqw_1cqw_0_var(--color-teal)]">
            <p className={`${monoLabel} text-teal`}>Garment details</p>
            <dl className="mt-[max(8px,2cqw)] grid gap-[max(6px,1.5cqw)]">
              {details.map((detail, index) => (
                <motion.div
                  key={detail.label}
                  initial={false}
                  animate={fx(
                    reading
                      ? {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.35, delay: 0.45 + index * 0.4 },
                        }
                      : { opacity: 0, x: -8, transition: { duration: 0, delay: 0.3 } },
                  )}
                >
                  <dt className={`${monoLabel} text-ink/50`}>{detail.label}</dt>
                  <dd className={`mt-[0.35em] flex items-center gap-[0.4em] font-bold ${bodyText}`}>
                    {detail.swatch && (
                      <span
                        className={`size-[0.8em] shrink-0 rounded-full border border-ink ${detail.swatch}`}
                      />
                    )}
                    {detail.value}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </motion.div>

        {/* The wardrobe's real filters, styled like the phone scene's: section, then category. */}
        <div className="absolute left-[9%] top-[15%] z-10 flex items-center gap-[max(5px,1.4cqw)]">
          <motion.span
            className={`rounded-full border-2 border-teal bg-teal px-[0.9em] py-[0.6em] text-canvas ${monoLabel}`}
            initial={false}
            animate={fx(
              filtered
                ? { opacity: 1, scale: 1, transition: { ...settle, delay: 0.1 } }
                : { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
            )}
          >
            {sectionLabel}
          </motion.span>
          <motion.span
            className={`inline-flex items-center gap-[0.6em] rounded-full border-2 border-teal bg-canvas px-[0.9em] py-[0.6em] text-ink ${monoLabel}`}
            initial={false}
            animate={fx(
              filtered
                ? { opacity: 1, scale: 1, transition: { ...settle, delay: 0.45 } }
                : { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
            )}
          >
            <span className="grid size-[1.2em] place-items-center rounded-[0.25em] bg-teal text-canvas">
              <Check className="size-[0.9em]" strokeWidth={4} />
            </span>
            {jacket.category}
            <span className="text-ink/50">{categoryCount}</span>
          </motion.span>
        </div>

        <motion.div className="absolute z-40" initial={false} animate={fx(tagTarget(phase))}>
          <div className="relative rounded-[2.4cqw] border-2 border-ink bg-canvas p-[max(8px,2.4cqw)] pt-[max(16px,5cqw)] shadow-[1cqw_1cqw_0_var(--color-ink)]">
            <span className="absolute left-1/2 top-[max(5px,1.6cqw)] size-[max(8px,1.8cqw)] -translate-x-1/2 rounded-full border-2 border-ink bg-peach" />
            <div className="h-[9cqw] rounded-[1.4cqw] border-2 border-ink bg-berry" />
            <p className={`mt-[max(6px,1.6cqw)] ${monoLabel} text-ink/50`}>New in</p>
            <p className={`mt-[0.3em] ${titleText}`}>Chore jacket, red</p>
            <motion.span
              className={`absolute inset-x-[4%] top-[max(18px,5.5cqw)] grid -rotate-12 place-items-center whitespace-nowrap rounded-[1.2cqw] border-[3px] border-berry bg-canvas/85 py-[0.7em] text-berry ${monoLabel}`}
              initial={false}
              animate={fx(
                owned
                  ? {
                      opacity: 1,
                      scale: 1,
                      transition: { type: "spring", bounce: 0.35, duration: 0.45, delay: 0.7 },
                    }
                  : { opacity: 0, scale: 1.6, transition: { duration: 0.2 } },
              )}
            >
              You own one
            </motion.span>
          </div>
        </motion.div>

        <motion.div
          className="absolute"
          style={{ zIndex: phase === "snap" || reading ? 10 : 30 }}
          initial={{ ...place(heroFrame), opacity: 0 }}
          animate={fx(jacketTarget(phase))}
        >
          <article className="overflow-hidden rounded-[2.2cqw] border-2 border-ink bg-canvas shadow-[1cqw_1cqw_0_var(--color-berry)]">
            <div className={`relative aspect-[4/5] overflow-hidden ${jacket.tint}`}>
              <Image
                src={jacket.image}
                alt=""
                className="size-full object-cover"
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 640px) 55vw, 310px"
              />
              {/* Shutter flash as the photo is taken. */}
              <motion.div
                className="absolute inset-0 bg-canvas"
                initial={false}
                animate={fx(
                  phase === "snap"
                    ? {
                        opacity: [0, 0, 0.85, 0],
                        transition: { duration: 0.9, times: [0, 0.4, 0.5, 1] },
                      }
                    : { opacity: 0, transition: { duration: 0 } },
                )}
              />
              <motion.div
                className="absolute inset-x-0 h-[max(4px,1cqw)] border-y-2 border-ink bg-citrus"
                initial={false}
                animate={fx(
                  reading
                    ? {
                        top: ["-2%", "98%"],
                        opacity: 1,
                        transition: {
                          top: { duration: 1, repeat: 1, repeatType: "reverse", ease: "easeInOut" },
                          opacity: { duration: 0.2 },
                        },
                      }
                    : { opacity: 0, transition: { duration: 0.2 } },
                )}
              />
              <motion.span
                className={`absolute bottom-[6%] left-[6%] rounded-full border-2 border-ink bg-citrus px-[0.9em] py-[0.6em] text-ink ${monoLabel}`}
                initial={false}
                animate={fx(
                  owned
                    ? { opacity: 1, scale: 1, rotate: -6, transition: { ...settle, delay: 0.3 } }
                    : { opacity: 0, scale: 0.6, rotate: 0, transition: { duration: 0.2 } },
                )}
              >
                Already yours
              </motion.span>
            </div>
            <motion.div
              className="overflow-hidden"
              initial={false}
              animate={fx(
                phase === "snap" || reading || filtered
                  ? // Once filtered, wait for the card to reach its larger frame so the name fits.
                    {
                      height: "auto",
                      opacity: 1,
                      transition: { duration: 0.3, delay: filtered ? 0.8 : 0 },
                    }
                  : { height: 0, opacity: 0, transition: { duration: 0.3 } },
              )}
            >
              <div className="grid border-t-2 border-ink p-[max(10px,2.8cqw)]">
                <motion.div
                  className="[grid-area:1/1]"
                  initial={false}
                  animate={fx(
                    reading
                      ? { opacity: 0, transition: { duration: 0.2, delay: 2.3 } }
                      : { opacity: filtered ? 0 : 1, transition: { duration: 0 } },
                  )}
                >
                  <p className={`${monoLabel} text-ink/50`}>New garment</p>
                  <span
                    className={`mt-[0.6em] inline-flex rounded-full border border-citrus/80 bg-citrus/40 px-[0.9em] py-[0.5em] text-ink ${monoLabel}`}
                  >
                    {reading ? "Reading details" : "Waiting"}
                  </span>
                </motion.div>
                <motion.div
                  className="[grid-area:1/1]"
                  initial={false}
                  animate={fx(
                    reading || filtered
                      ? {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.3, delay: reading ? 2.4 : 0 },
                        }
                      : { opacity: 0, y: 4, transition: { duration: 0 } },
                  )}
                >
                  <p className={`${monoLabel} text-teal`}>{jacket.category}</p>
                  <p className={`mt-[0.4em] ${titleText}`}>{jacket.name}</p>
                </motion.div>
              </div>
            </motion.div>
          </article>
        </motion.div>
      </div>

      <DemoPauseButton
        paused={paused}
        onToggle={() => setPaused((current) => !current)}
        label="the shop check demo"
        className="absolute bottom-0 right-[3%]"
      />
    </div>
  );
}
