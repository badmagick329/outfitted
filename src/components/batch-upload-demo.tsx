"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useInView } from "motion/react";
import { Check, Images, LoaderCircle, Upload } from "lucide-react";
import {
  DemoPauseButton,
  usePageVisible,
  useReducedMotionPreference,
} from "@/components/demo-playback";
import { demoGarment, demoWardrobe, type DemoGarmentId } from "@/components/demo-wardrobe";
import { MemberStatusBadge } from "@/components/member-status-badge";
import { batchUploadConcurrency, maxBatchGarments } from "@/features/wardrobe/domain/batch-import";
import { maxPhotoSizeBytes } from "@/features/wardrobe/domain/photo-files";

/*
 * A scripted run of the real batch import: photos land in the tray, upload a few at a time with
 * the tray's own status chips, and appear in the wardrobe where the analysis badges take over.
 * Five garments are already filed, so the batch completes the 17-piece sample wardrobe.
 *
 * One clock drives everything. Each garment's moments are precomputed by replaying the import's
 * worker pool, and the clock jumps from one moment to the next, so pausing simply stops the jump.
 */

const batch: { id: DemoGarmentId; file: string; uploadMs: number }[] = [
  { id: "navy-overcoat", file: "IMG_4127.HEIC", uploadMs: 1100 },
  { id: "khaki-mac", file: "IMG_4128.HEIC", uploadMs: 1500 },
  { id: "indigo-jeans", file: "IMG_4131.HEIC", uploadMs: 900 },
  { id: "oxford-shirt", file: "oxford.jpg", uploadMs: 1300 },
  { id: "black-rollneck", file: "IMG_4135.HEIC", uploadMs: 1000 },
  { id: "cream-cardigan", file: "IMG_4136.HEIC", uploadMs: 1400 },
  { id: "breton-top", file: "IMG_4139.HEIC", uploadMs: 1200 },
  { id: "olive-shorts", file: "IMG_4140.HEIC", uploadMs: 900 },
  { id: "grey-hoodie", file: "hoodie.png", uploadMs: 1500 },
  { id: "rust-overshirt", file: "IMG_4142.HEIC", uploadMs: 1100 },
  { id: "white-trainers", file: "IMG_4144.HEIC", uploadMs: 1000 },
  { id: "chelsea-boots", file: "IMG_4146.HEIC", uploadMs: 1300 },
];

const batchIds = new Set<string>(batch.map((entry) => entry.id));
// Newest first, as the wardrobe lists them.
const alreadyFiled = demoWardrobe.filter((garment) => !batchIds.has(garment.id)).reverse();

const IMPORT_AT = 1600;

type Timing = { start: number; added: number; reading: number; done: number };

// Replays runWithConcurrency: each photo takes the first upload slot to come free.
const timings: Timing[] = (() => {
  const slots = Array<number>(batchUploadConcurrency).fill(IMPORT_AT);
  return batch.map((entry, index) => {
    const slot = slots.indexOf(Math.min(...slots));
    const start = slots[slot];
    const added = start + entry.uploadMs;
    slots[slot] = added;
    const reading = added + 500 + (index % 3) * 300;
    return { start, added, reading, done: reading + 1600 + (index % 4) * 250 };
  });
})();

const ALL_DONE = Math.max(...timings.map((timing) => timing.done));
const CLEAR_AT = ALL_DONE + 2800;
const CYCLE_END = CLEAR_AT + 700;
const moments = [
  ...new Set([
    IMPORT_AT,
    ...timings.flatMap(({ start, added, reading, done }) => [start, added, reading, done]),
    CLEAR_AT,
    CYCLE_END,
  ]),
].sort((a, b) => a - b);

type UploadStatus = "waiting" | "uploading" | "added";

function uploadStatus(timing: Timing, t: number): UploadStatus {
  if (t < timing.start) return "waiting";
  return t < timing.added ? "uploading" : "added";
}

// Mirrors the tray chips in batch-upload-form.tsx.
const chipStyles: Record<UploadStatus, string> = {
  waiting: "border-line bg-canvas text-ink/60",
  uploading: "border-citrus bg-citrus/70 text-ink",
  added: "border-teal/25 bg-mist text-teal-dark",
};

// Two rows on narrow screens, three where the panel has three columns.
const VISIBLE_CARDS = 9;
const NARROW_CARDS = 4;
const maxPhotoMegabytes = maxPhotoSizeBytes / 1024 / 1024;

const panelLabel = "font-mono text-[10px] font-bold uppercase tracking-[0.14em]";

export function BatchUploadDemo() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.3 });
  const reducedMotion = useReducedMotionPreference();
  const pageVisible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState({ cycle: 0, elapsed: 0 });

  const playing = !reducedMotion && !paused && inView && pageVisible;
  // Reduced motion shows the finished batch as a still.
  const t = reducedMotion ? ALL_DONE : clock.elapsed;

  useEffect(() => {
    if (!playing) return;
    const next = moments.find((moment) => moment > clock.elapsed) ?? CYCLE_END;
    const timer = setTimeout(
      () =>
        setClock(({ cycle }) =>
          next >= CYCLE_END ? { cycle: cycle + 1, elapsed: 0 } : { cycle, elapsed: next },
        ),
      next - clock.elapsed,
    );
    return () => clearTimeout(timer);
  }, [playing, clock.elapsed]);

  const statuses = timings.map((timing) => uploadStatus(timing, t));
  const addedCount = statuses.filter((status) => status === "added").length;
  const started = t >= IMPORT_AT;
  const clearing = t >= CLEAR_AT;
  const filed = batch
    .map((entry, index) => ({ entry, timing: timings[index] }))
    .filter(({ timing }) => t >= timing.added)
    .sort((a, b) => b.timing.added - a.timing.added);
  const cards = [
    ...filed.map(({ entry, timing }) => ({
      garment: demoGarment(entry.id),
      badge:
        t < timing.reading
          ? ("pending" as const)
          : t < timing.done
            ? ("processing" as const)
            : null,
    })),
    ...alreadyFiled.map((garment) => ({ garment, badge: null })),
  ].slice(0, VISIBLE_CARDS);
  const wardrobeCount = alreadyFiled.length + addedCount;

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="@container relative">
        <div
          role="img"
          aria-label={`Animated demo: ${batch.length} garment photos upload ${batchUploadConcurrency} at a time, then appear in the wardrobe while their details are read.`}
          className="grid gap-5 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @4xl:items-start"
        >
          <div className="rounded-[1.75rem] border-2 border-ink bg-canvas p-4 shadow-[8px_8px_0_var(--color-citrus)] sm:p-5">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-teal/50 bg-mist/50 px-4 py-3">
              <Images size={22} className="shrink-0 text-berry" aria-hidden="true" />
              <div className="min-w-0">
                <strong className="block text-base leading-tight">
                  {batch.length} garments in this batch
                </strong>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink/50">
                  One garment per photo · up to {maxBatchGarments} · {maxPhotoMegabytes}MB each
                </span>
              </div>
            </div>

            <motion.ul
              key={clock.cycle}
              className="mt-4 grid grid-cols-3 gap-2 @md:grid-cols-4 @md:gap-3"
              initial={false}
              animate={{ opacity: clearing ? 0 : 1 }}
              transition={{ duration: 0.4 }}
            >
              {batch.map((entry, index) => {
                const garment = demoGarment(entry.id);
                const status = statuses[index];
                return (
                  <motion.li
                    key={entry.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-line bg-canvas"
                    initial={{ opacity: 0, y: -18, rotate: index % 2 ? 3 : -3 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6, delay: index * 0.07 }}
                  >
                    <div className={`relative ${garment.tint}`}>
                      <Image
                        src={garment.image}
                        alt=""
                        className="aspect-[4/5] w-full object-cover"
                        sizes="(max-width: 640px) 30vw, 130px"
                      />
                      <span
                        className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide transition-colors @md:px-2 @md:py-1 @md:text-[9px] ${chipStyles[status]}`}
                      >
                        {status === "uploading" && (
                          <LoaderCircle size={9} className="animate-spin" aria-hidden="true" />
                        )}
                        {status === "added" && <Check size={9} aria-hidden="true" />}
                        {status}
                      </span>
                    </div>
                    <span className="block truncate border-t border-line px-2 py-1.5 font-mono text-[9px] text-ink/55">
                      {entry.file}
                    </span>
                  </motion.li>
                );
              })}
            </motion.ul>

            <div className="mt-4 min-h-[3.25rem]">
              {started ? (
                <>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <strong>
                      {addedCount} of {batch.length} processed
                    </strong>
                    <span className="text-ink/55">{addedCount} added</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60">
                    <div
                      className="h-full rounded-full bg-teal transition-[width] duration-500"
                      style={{ width: `${(addedCount / batch.length) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/55">
                    {addedCount === batch.length
                      ? "Your new garments are ready. AI details will continue filling in where enabled."
                      : `Uploading ${batchUploadConcurrency} at a time.`}
                  </p>
                </>
              ) : (
                <span className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-berry text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)]">
                  <Upload size={16} aria-hidden="true" />
                  Import {batch.length} garments
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border-2 border-ink bg-canvas p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold tracking-[-0.03em]">Wardrobe</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border-2 border-ink bg-teal px-2.5 py-1 text-canvas ${panelLabel}`}
              >
                <span className="relative inline-flex overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={wardrobeCount}
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "-100%", opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {wardrobeCount}
                    </motion.span>
                  </AnimatePresence>
                </span>
                garments
              </span>
            </div>
            <ul className="relative mt-4 grid grid-cols-2 gap-3 @md:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {cards.map(({ garment, badge }, index) => (
                  <motion.li
                    key={garment.id}
                    layout
                    className={`overflow-hidden rounded-2xl border border-line bg-canvas ${index >= NARROW_CARDS ? "hidden @md:block" : ""}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.55 }}
                  >
                    <div className={`relative ${garment.tint}`}>
                      <Image
                        src={garment.image}
                        alt=""
                        className="aspect-[4/5] w-full object-cover"
                        sizes="(max-width: 640px) 45vw, 160px"
                      />
                      {badge && (
                        <span className="absolute right-1.5 top-1.5">
                          <MemberStatusBadge status={badge} compact />
                        </span>
                      )}
                    </div>
                    <div className="grid min-h-[3.25rem] content-start p-2.5">
                      <motion.div
                        initial={false}
                        animate={{ opacity: badge ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <strong className="line-clamp-1 block text-xs">{garment.name}</strong>
                        <span className="mt-0.5 block truncate text-[11px] text-ink/60">
                          {garment.category}
                        </span>
                      </motion.div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>

        <DemoPauseButton
          paused={paused}
          onToggle={() => setPaused((current) => !current)}
          label="the batch upload demo"
          className="absolute -bottom-4 right-4"
        />
      </div>
    </MotionConfig>
  );
}
