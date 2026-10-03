"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, type TargetAndTransition } from "motion/react";
import {
  DemoPauseButton,
  usePageVisible,
  useReducedMotionPreference,
} from "@/components/demo-playback";
import { demoGarment, demoWardrobe, type DemoGarment } from "@/components/demo-wardrobe";

/*
 * The landing hero's "photo to outfit" loop: a garment is photographed, its details are read, it
 * is filed into the wardrobe, and the Outfit Desk builds an outfit around it.
 *
 * Every moving piece is absolutely positioned in percentages of a fixed-ratio stage and sized in
 * container units, so the loop scales like a video without shipping one. Text sizes carry px floors
 * so labels stay legible on phones; the layout leaves room for that growth.
 */

const phases = ["snap", "read", "file", "filed", "ask", "outfit", "clear"] as const;
type Phase = (typeof phases)[number];

const phaseDurations: Record<Phase, number> = {
  snap: 1300,
  read: 3000,
  file: 1200,
  filed: 1200,
  ask: 2400,
  outfit: 3400,
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
const gridTilt = [-2, 1.5, -1, 2, -1.5, 1];
const seatTilt = [-3, 2, -2];

function gridFrame(slot: number): Frame {
  return {
    left: 9 + (slot % 3) * 28.5,
    top: 17 + Math.floor(slot / 3) * down(25 * TILE_ASPECT + 3.5),
    width: 25,
    rotate: gridTilt[slot],
  };
}

// Once the Outfit Desk opens, the wardrobe tucks into a single shelf along the top.
function shelfFrame(slot: number): Frame {
  return { left: 6 + slot * 15, top: 9, width: 13, rotate: 0 };
}

function seatFrame(seat: number): Frame {
  return { left: 10 + seat * 28, top: 60, width: 24, rotate: seatTilt[seat] };
}

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

type Tile = { garment: DemoGarment; slot: number; seat?: number };

const tiles: Tile[] = [
  { garment: demoGarment("off-white-tee"), slot: 0, seat: 0 },
  { garment: demoGarment("teal-camp-shirt"), slot: 1 },
  { garment: demoGarment("stone-trousers"), slot: 2, seat: 2 },
  { garment: demoGarment("citrus-knit"), slot: 3 },
];
const jacket = demoGarment("berry-chore-jacket");
const JACKET_SLOT = 4;
const JACKET_SEAT = 1;
const MORE_SLOT = 5;

function tileTarget(slot: number, seat: number | undefined, phase: Phase): TargetAndTransition {
  const outfitFrame = seat === undefined ? shelfFrame(slot) : seatFrame(seat);
  switch (phase) {
    case "snap":
    case "read":
      return pose(gridFrame(slot), 0, { duration: 0 }, 0.85);
    case "file":
    case "filed":
      return pose(gridFrame(slot), 1, { ...settle, delay: slot * 0.07 });
    case "ask":
      return pose(shelfFrame(slot), 1, { ...settle, delay: slot * 0.04 });
    case "outfit":
      return seat === undefined
        ? pose(outfitFrame, 0.4, { duration: 0.4 })
        : pose(outfitFrame, 1, { ...settle, delay: 0.25 + seat * 0.2 });
    case "clear":
      return pose(outfitFrame, 0, fadeOut);
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
      return pose(gridFrame(JACKET_SLOT), 1, { ...settle, delay: 0.3 });
    case "ask":
      return pose(shelfFrame(JACKET_SLOT), 1, { ...settle, delay: 0.16 });
    case "outfit":
      return pose(seatFrame(JACKET_SEAT), 1, { ...settle, delay: 0.45 });
    case "clear":
      return pose(seatFrame(JACKET_SEAT), 0, fadeOut);
  }
}

const details = [
  { label: "Category", value: "Outerwear" },
  { label: "Colour", value: "Berry red", swatch: "bg-berry" },
  { label: "Material", value: "Cotton canvas" },
  { label: "Season", value: "Autumn" },
];

const prompt = "A relaxed Saturday in town";
const TYPE_INTERVAL_MS = 55;
// Ticks of hesitation before typing starts, so the desk lands first.
const TYPE_DELAY_TICKS = 8;

const monoLabel =
  "font-mono text-[length:max(8px,1.55cqw)] font-bold uppercase tracking-[0.14em] leading-none";
const bodyText = "text-[length:max(11px,2.5cqw)] leading-snug";
const titleText = "text-[length:max(13px,3.3cqw)] font-bold leading-tight tracking-[-0.03em]";

const instantly = (target: TargetAndTransition): TargetAndTransition => ({
  ...target,
  transition: { duration: 0 },
});

export function PhotoToOutfitLoop() {
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.3 });
  const reducedMotion = useReducedMotionPreference();
  const pageVisible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState({ index: 0, cycle: 0 });
  const [typed, setTyped] = useState({ cycle: -1, length: 0 });

  const playing = !reducedMotion && !paused && inView && pageVisible;
  // Reduced motion shows the finished outfit as a still.
  const phase: Phase = reducedMotion ? "outfit" : phases[step.index];
  const at = phaseIndex(phase);
  const fx = reducedMotion ? instantly : (target: TargetAndTransition) => target;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () =>
        setStep(({ index, cycle }) =>
          index === phases.length - 1
            ? { index: 0, cycle: cycle + 1 }
            : { index: index + 1, cycle },
        ),
      phaseDurations[phases[step.index]],
    );
    return () => clearTimeout(timer);
  }, [playing, step.index]);

  useEffect(() => {
    if (phase !== "ask" || !playing) return;
    const timer = setInterval(
      () =>
        setTyped((current) => {
          const length = current.cycle === step.cycle ? current.length : -TYPE_DELAY_TICKS;
          return length >= prompt.length ? current : { cycle: step.cycle, length: length + 1 };
        }),
      TYPE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [phase, playing, step.cycle]);

  const typedLength =
    phase === "ask"
      ? Math.max(0, typed.cycle === step.cycle ? typed.length : 0)
      : at > phaseIndex("ask")
        ? prompt.length
        : 0;
  // The jacket is the sample wardrobe's newest piece, so the count lands on the full wardrobe.
  const pieceCount = at >= phaseIndex("filed") ? demoWardrobe.length : demoWardrobe.length - 1;
  const reading = phase === "read";
  const filing = phase === "file" || phase === "filed";
  const deskOpen = phase === "ask" || phase === "outfit";

  return (
    <div ref={stage} className="@container relative mx-auto aspect-[57/65] w-full max-w-[570px]">
      <div
        role="img"
        aria-label="Animated demo: a garment photo is added, Outfitted reads its details and files it in the wardrobe, then the Outfit Desk builds an outfit around it."
        className="absolute inset-0"
      >
        <div className="absolute inset-x-[8%] top-[8%] h-[82%] rotate-2 rounded-[2rem] bg-citrus" />
        <div className="absolute inset-x-[4%] top-[4%] h-[84%] -rotate-2 rounded-[2rem] border-2 border-ink bg-mist" />

        <motion.div
          className="absolute left-[9%] top-[7.5%] z-10 flex w-[82%] items-center justify-between gap-3"
          initial={false}
          animate={fx(
            filing
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
                  key={pieceCount}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  {pieceCount}
                </motion.span>
              </AnimatePresence>
            </span>
            pieces
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
            className="absolute"
            style={{ zIndex: phase === "outfit" && tile.seat !== undefined ? 30 : 10 }}
            initial={false}
            animate={fx(tileTarget(tile.slot, tile.seat, phase))}
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
          animate={fx(tileTarget(MORE_SLOT, undefined, phase))}
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

        <motion.div
          className="absolute z-20 h-[63%] w-[90%] rounded-[3cqw] border-2 border-ink bg-canvas shadow-[1.2cqw_1.2cqw_0_var(--color-citrus)]"
          style={{ left: "5%", top: "28%" }}
          initial={false}
          animate={fx(
            deskOpen
              ? { opacity: 1, y: 0, transition: settle }
              : { opacity: 0, y: 24, transition: { duration: 0.3 } },
          )}
        >
          <div className="p-[max(12px,3.6cqw)]">
            <div className="flex items-center justify-between gap-3">
              <span className={`${monoLabel} text-berry`}>Outfit Desk</span>
              <motion.span
                className={`rounded-full border-2 border-ink bg-citrus px-[0.9em] py-[0.6em] text-ink ${monoLabel}`}
                initial={false}
                animate={fx(
                  phase === "outfit"
                    ? { opacity: 1, scale: 1, rotate: 4, transition: { ...settle, delay: 1.2 } }
                    : { opacity: 0, scale: 0.6, rotate: 0, transition: { duration: 0.2 } },
                )}
              >
                Outfit ready
              </motion.span>
            </div>
            <p className={`mt-[max(8px,2cqw)] font-bold ${bodyText}`}>What are you dressing for?</p>
            <div
              className={`mt-[max(6px,1.4cqw)] grid rounded-[1.6cqw] border border-teal/20 bg-mist px-[1em] py-[0.8em] ${bodyText}`}
            >
              <span className="invisible [grid-area:1/1]">{prompt}</span>
              <span className="[grid-area:1/1]">
                {prompt.slice(0, typedLength)}
                {phase === "ask" && (
                  <motion.span
                    className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.15em] bg-berry"
                    animate={playing ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
                    transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                  />
                )}
              </span>
            </div>
          </div>
        </motion.div>

        {seatTilt.map((_, seat) => (
          <motion.div
            key={seat}
            className="absolute z-20 aspect-[4/5] rounded-[2.2cqw] border-2 border-dashed border-ink/30"
            style={place({ ...seatFrame(seat), rotate: 0 })}
            initial={false}
            animate={fx(
              deskOpen
                ? { opacity: 1, y: 0, transition: settle }
                : { opacity: 0, y: 24, transition: { duration: 0.3 } },
            )}
          />
        ))}

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
            </div>
            <motion.div
              className="overflow-hidden"
              initial={false}
              animate={fx(
                phase === "snap" || reading
                  ? { height: "auto", opacity: 1, transition: { duration: 0.3 } }
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
                      : { opacity: 1, transition: { duration: 0 } },
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
                    reading
                      ? { opacity: 1, y: 0, transition: { duration: 0.3, delay: 2.4 } }
                      : { opacity: 0, y: 4, transition: { duration: 0 } },
                  )}
                >
                  <p className={`${monoLabel} text-teal`}>Outerwear</p>
                  <p className={`mt-[0.4em] ${titleText}`}>Berry chore jacket</p>
                </motion.div>
              </div>
            </motion.div>
          </article>
        </motion.div>
      </div>

      <DemoPauseButton
        paused={paused}
        onToggle={() => setPaused((current) => !current)}
        label="the photo-to-outfit demo"
        className="absolute bottom-0 right-[3%]"
      />
    </div>
  );
}
