"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { demoGarment, demoWardrobe, type DemoGarmentId } from "@/components/demo-wardrobe";

/*
 * Scripted Outfit Desk suggestions over the sample wardrobe: no AI call, so visitors can play
 * freely. Picked garments share a layoutId between the wardrobe grid and the outfit tray, so
 * choosing an occasion visibly pulls pieces out of the wardrobe and puts the last ones back.
 */

type Occasion = { id: string; label: string; picks: DemoGarmentId[]; reason: string };

const occasions: Occasion[] = [
  {
    id: "rainy-commute",
    label: "A rainy commute",
    picks: ["khaki-mac", "citrus-knit", "oxford-shirt", "indigo-jeans"],
    reason:
      "The mac takes the weather. A citrus knit over the oxford keeps a grey morning bright, and dark jeans hide the splashes.",
  },
  {
    id: "saturday-in-town",
    label: "Saturday in town",
    picks: ["berry-chore-jacket", "off-white-tee", "stone-trousers", "white-trainers"],
    reason:
      "Easy layers: the berry jacket does the talking while the tee and stone trousers keep it relaxed.",
  },
  {
    id: "dinner-out",
    label: "Dinner out",
    picks: ["navy-overcoat", "black-rollneck", "stone-trousers", "chelsea-boots"],
    reason:
      "Dark, quiet layers with stone trousers for contrast. The suede boots dress it up without trying.",
  },
  {
    id: "summer-weekend",
    label: "A summer weekend",
    picks: ["teal-camp-shirt", "breton-top", "olive-shorts", "white-trainers"],
    reason:
      "Stripes and olive keep it easy; the camp shirt goes on over the top when the evening cools.",
  },
  {
    id: "cosy-sunday",
    label: "A cosy Sunday",
    picks: ["rust-overshirt", "grey-hoodie", "indigo-jeans", "white-trainers"],
    reason: "Soft grey under rust cord: warm enough for a walk, relaxed enough for the sofa.",
  },
];

const flight = { type: "spring", bounce: 0.2, duration: 0.65 } as const;
const tileRadius = { borderRadius: 10 };

export function OutfitOccasionDemo() {
  const [occasion, setOccasion] = useState(occasions[0]);
  const picked = new Set<string>(occasion.picks);

  return (
    <MotionConfig reducedMotion="user" transition={flight}>
      <div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Choose an occasion"
        >
          <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
            Dress me for
          </span>
          {occasions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === occasion.id}
              onClick={() => setOccasion(option)}
              className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${option.id === occasion.id ? "border-ink bg-berry text-canvas shadow-[3px_3px_0_var(--color-citrus)]" : "border-ink/20 bg-canvas text-ink/70 hover:border-ink"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <section
            aria-label="Sample wardrobe"
            className="rounded-[1.75rem] border-2 border-ink bg-canvas p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold tracking-[-0.03em]">Your wardrobe</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-ink/50">
                {demoWardrobe.length - picked.size} on the rail
              </span>
            </div>
            <ul className="mt-4 grid grid-cols-6 gap-2">
              {demoWardrobe.map((garment) => (
                <li key={garment.id} className="aspect-[4/5]">
                  {picked.has(garment.id) ? (
                    <div
                      className="size-full rounded-[10px] border-2 border-dashed border-ink/25"
                      aria-hidden="true"
                    />
                  ) : (
                    <motion.div
                      layoutId={`occasion-${garment.id}`}
                      style={tileRadius}
                      className={`size-full overflow-hidden border-2 border-ink ${garment.tint}`}
                    >
                      <Image
                        src={garment.image}
                        alt={garment.name}
                        className="size-full object-cover"
                        sizes="(max-width: 1024px) 15vw, 70px"
                      />
                    </motion.div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label="Suggested outfit"
            className="rounded-[1.75rem] border-2 border-ink bg-canvas p-4 shadow-[8px_8px_0_var(--color-citrus)] sm:p-6"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
              Outfit Desk
            </p>
            <p className="mt-1 text-xl font-bold tracking-[-0.03em]">{occasion.label}</p>
            <ul className="mt-5 grid grid-cols-4 gap-3">
              {occasion.picks.map((id, index) => {
                const garment = demoGarment(id);
                return (
                  <li key={id}>
                    <motion.div
                      layoutId={`occasion-${id}`}
                      style={tileRadius}
                      className={`overflow-hidden border-2 border-ink shadow-[3px_3px_0_var(--color-ink)] ${garment.tint}`}
                      transition={{ ...flight, delay: index * 0.06 }}
                    >
                      <Image
                        src={garment.image}
                        alt=""
                        className="aspect-[4/5] w-full object-cover"
                        sizes="(max-width: 1024px) 22vw, 130px"
                      />
                    </motion.div>
                    <span className="mt-2 block text-xs font-bold leading-tight">
                      {garment.name}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 min-h-[4.5rem] border-t-2 border-teal/25 pt-4" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={occasion.id}
                  className="leading-7 text-ink/70"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {occasion.reason}
                </motion.p>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}
