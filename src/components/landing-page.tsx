import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ListChecks, LockKeyhole, Palette } from "lucide-react";
import { BrandWordmark } from "@/components/brand";
import { demoGarment, demoWardrobe } from "@/components/demo-wardrobe";
import { OutfitOccasionDemo } from "@/components/outfit-occasion-demo";
import { PhotoToOutfitLoop } from "@/components/photo-to-outfit-loop";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import { WardrobeFilterDemo } from "@/components/wardrobe-filter-demo";
import type { AccessMode } from "@/features/access/contracts";

const steps = [
  {
    number: "01",
    title: "Photograph it",
    body: "From your phone or computer, one piece at a time or a whole batch.",
  },
  {
    number: "02",
    title: "Details fill in",
    body: "Optional AI notes category, colour, material and season. Edit anything.",
  },
  {
    number: "03",
    title: "Browse and filter",
    body: "Jump between sections and style tags; archive what is out of rotation.",
  },
];

// Mirrors the member review report: entries cite the garments they are about.
const reviewEntries = [
  {
    kind: "Strength",
    title: "Colour that still layers",
    detail:
      "The berry jacket and citrus knit bring the energy, and both sit easily over the off-white tee.",
    garments: [
      demoGarment("berry-chore-jacket"),
      demoGarment("citrus-knit"),
      demoGarment("off-white-tee"),
    ],
    tone: "bg-mist",
  },
  {
    kind: "Gap",
    title: "Nothing for wet feet",
    detail:
      "Suede boots and white trainers both dread the rain. A leather pair would finish the mac on wet commutes.",
    garments: [
      demoGarment("chelsea-boots"),
      demoGarment("white-trainers"),
      demoGarment("khaki-mac"),
    ],
    tone: "bg-peach/55",
  },
];

function GarmentStrip() {
  return (
    <Marquee pauseOnHover className="py-4 [--duration:80s] [--gap:1.25rem]">
      {demoWardrobe.map((garment) => (
        <article
          key={garment.id}
          className="flex w-[290px] shrink-0 items-center gap-3 rounded-2xl border-2 border-ink bg-canvas p-3 shadow-[4px_4px_0_var(--color-peach)]"
        >
          <Image
            src={garment.image}
            alt=""
            className={`size-20 rounded-xl object-cover ${garment.tint}`}
            sizes="80px"
          />
          <div className="min-w-0">
            <strong className="block text-base leading-tight">{garment.name}</strong>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55">
              {garment.category} · {garment.colour}
            </span>
          </div>
        </article>
      ))}
    </Marquee>
  );
}

export function LandingPage({ accessMode }: { accessMode: AccessMode }) {
  const isPublic = accessMode === "public";
  const entryCta = isPublic ? "Start your wardrobe" : "Request access";
  return (
    <main className="overflow-hidden bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <BrandWordmark />
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <a
            href="#how-it-works"
            className="hidden text-sm font-semibold text-ink/65 transition hover:text-ink sm:block"
          >
            How it works
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border-2 border-ink bg-canvas px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-mist"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-79px)] w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:px-10 lg:pb-20 lg:pt-4">
        <div className="relative z-10 max-w-2xl">
          <BlurFade delay={0.04}>
            <h1 className="max-w-3xl text-[clamp(3.6rem,9vw,7.4rem)] font-bold leading-[0.84] tracking-[-0.085em]">
              Open your wardrobe from <span className="text-teal">anywhere.</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.12}>
            <p className="mt-8 max-w-xl text-lg leading-8 text-ink/68 sm:text-xl">
              Photograph, organise and browse your clothes in a private visual catalogue, with
              outfit help when you want it.
            </p>
          </BlurFade>
          <BlurFade delay={0.2}>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-berry px-6 py-3.5 text-base font-bold text-canvas shadow-[4px_4px_0_var(--color-citrus)] transition hover:-translate-y-0.5 hover:bg-berry-dark"
              >
                {entryCta} <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 underline decoration-teal/45 decoration-2 underline-offset-4 transition hover:text-teal"
              >
                Take a look around
              </a>
            </div>
          </BlurFade>
        </div>
        <PhotoToOutfitLoop />
      </section>

      <section className="border-y-2 border-ink bg-mist py-5" aria-label="Example garments">
        <GarmentStrip />
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32"
      >
        <BlurFade inView>
          <div className="max-w-3xl">
            <h2 className="text-4xl font-bold leading-[0.95] tracking-[-0.065em] sm:text-6xl">
              Your clothes, easy to see and easy to remember.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/65">
              Outfitted keeps the useful details close to the photograph, without turning your
              wardrobe into an admin job. Have a go with this sample wardrobe.
            </p>
          </div>
        </BlurFade>

        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((step, index) => (
            <BlurFade key={step.number} inView delay={index * 0.08}>
              <li className="border-t-2 border-ink pt-4">
                <span className="font-mono text-xs font-bold text-berry">{step.number}</span>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.04em]">{step.title}</h3>
                <p className="mt-1.5 leading-7 text-ink/65">{step.body}</p>
              </li>
            </BlurFade>
          ))}
        </ol>

        <BlurFade inView delay={0.1} className="mt-12">
          <WardrobeFilterDemo />
        </BlurFade>
      </section>

      <section
        aria-labelledby="outfit-desk-heading"
        className="border-y-2 border-ink bg-mist px-5 py-24 sm:px-8 lg:py-32"
      >
        <div className="mx-auto w-full max-w-7xl lg:px-2">
          <BlurFade inView>
            <div className="max-w-3xl">
              <h2
                id="outfit-desk-heading"
                className="text-4xl font-bold leading-[0.95] tracking-[-0.065em] sm:text-6xl"
              >
                Dressed for whatever is next.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/65">
                Tell the Outfit Desk where you are going. It picks from the clothes you already own
                and says why. Try it on the sample wardrobe; these suggestions are pre-written
                examples.
              </p>
            </div>
          </BlurFade>
          <BlurFade inView delay={0.1} className="mt-10">
            <OutfitOccasionDemo />
          </BlurFade>
        </div>
      </section>

      <section className="bg-teal px-5 py-24 text-canvas sm:px-8 lg:py-32">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
          <BlurFade inView direction="left">
            <div>
              <span className="inline-flex rounded-2xl bg-citrus p-3 text-ink">
                <ListChecks size={24} />
              </span>
              <h2 className="mt-7 text-4xl font-bold leading-[0.95] tracking-[-0.065em] sm:text-6xl">
                A little help, when you want it.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-canvas/72">
                Optional AI fills in garment details and suggests outfits. For the bigger picture,
                ask for a wardrobe review against your own style notes: what is working, what is
                missing, and the pieces behind each point. Every detail stays yours to edit.
              </p>
            </div>
          </BlurFade>

          <BlurFade inView direction="right" delay={0.1}>
            <div>
              <aside className="relative z-10 -mb-7 ml-auto mr-3 w-fit max-w-[16rem] rotate-3 rounded-2xl border-2 border-ink bg-peach p-4 text-ink shadow-[5px_5px_0_var(--color-ink)] sm:-mr-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
                  <Palette size={13} aria-hidden="true" /> Your style notes
                </p>
                <ul className="mt-2 grid gap-1 text-sm font-semibold leading-snug">
                  <li>Relaxed, a little playful</li>
                  <li>Warm colours, soft structure</li>
                  <li>No big logos</li>
                </ul>
              </aside>
              <article className="rounded-[2rem] border-2 border-ink bg-canvas p-5 pt-9 text-ink shadow-[10px_10px_0_var(--color-citrus)] sm:p-8 sm:pt-10">
                <div className="border-b-2 border-teal/25 pb-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
                    Wardrobe review
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-[-0.03em]">
                    17 garments, read against your style
                  </h3>
                  <p className="mt-3 leading-7 text-ink/68">
                    A relaxed, colour-confident wardrobe built on easy layers. The brights work
                    hardest when a neutral holds them down.
                  </p>
                </div>
                <div className="mt-5 grid gap-3">
                  {reviewEntries.map((entry, index) => (
                    <BlurFade key={entry.kind} inView delay={0.2 + index * 0.1}>
                      <section
                        className={`rounded-2xl border border-line p-4 sm:p-5 ${entry.tone}`}
                      >
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
                          {entry.kind}
                        </p>
                        <h4 className="mt-1 text-lg font-bold tracking-[-0.025em]">
                          {entry.title}
                        </h4>
                        <p className="mt-1.5 text-sm leading-6 text-ink/65">{entry.detail}</p>
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Garments cited">
                          {entry.garments.map((garment) => (
                            <li
                              key={garment.name}
                              className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pr-3"
                            >
                              <Image
                                src={garment.image}
                                alt=""
                                className={`size-9 shrink-0 rounded-lg object-cover ${garment.tint}`}
                                sizes="36px"
                              />
                              <span className="text-xs font-bold">{garment.name}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </BlurFade>
                  ))}
                </div>
              </article>
            </div>
          </BlurFade>
        </div>
      </section>

      <section
        id="privacy"
        className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-32"
      >
        <BlurFade inView direction="left">
          <div className="relative mx-auto aspect-square w-full max-w-lg">
            <div className="absolute inset-[10%] rotate-6 rounded-[2.5rem] bg-peach" />
            <div className="absolute inset-[10%] -rotate-3 rounded-[2.5rem] border-2 border-ink bg-berry" />
            <div className="absolute inset-[19%] grid place-items-center rounded-full border-2 border-ink bg-citrus shadow-[8px_8px_0_var(--color-ink)]">
              <LockKeyhole className="size-[30%] text-ink" strokeWidth={1.7} />
            </div>
          </div>
        </BlurFade>
        <BlurFade inView direction="right" delay={0.08}>
          <div>
            <h2 className="text-4xl font-bold leading-[0.95] tracking-[-0.065em] sm:text-6xl">
              Your wardrobe is yours.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">
              Outfitted is a private catalogue, not a social network. Garment photos are served
              through an account-protected route, so other users cannot open your image links.
            </p>
            <ul className="mt-8 grid gap-4">
              {[
                "No public wardrobe or profile",
                "No social feed or follower count",
                "Your catalogue is scoped to your account",
                "Image links only work for their owner",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 font-semibold">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal text-canvas">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </BlurFade>
      </section>

      <section className="px-5 pb-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] border-2 border-ink bg-berry p-7 text-canvas shadow-[8px_8px_0_var(--color-citrus)] sm:p-10 lg:flex-row lg:items-end lg:p-14">
          <div>
            <h2 className="max-w-3xl text-4xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-6xl">
              Put your wardrobe within reach.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-canvas/72">
              {isPublic
                ? "Sign in with your Google account and start adding your clothes right away."
                : "Request access with your Google account. Once approved, you can start adding your clothes."}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-citrus px-6 py-3.5 font-bold text-ink transition hover:-translate-y-0.5 hover:bg-canvas"
          >
            {entryCta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-10 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <BrandWordmark />
        <div className="flex items-center gap-5">
          <a href="#privacy" className="font-semibold transition hover:text-ink">
            Privacy
          </a>
          <Link href="/login" className="font-semibold transition hover:text-ink">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
