import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  Eye,
  Layers3,
  ListPlus,
  LockKeyhole,
  Shirt,
} from "lucide-react";
import berryJacket from "../../public/landing/berry-chore-jacket.webp";
import citrusKnit from "../../public/landing/citrus-knit.webp";
import offWhiteTee from "../../public/landing/off-white-tee.webp";
import stoneTrousers from "../../public/landing/stone-trousers.webp";
import tealShirt from "../../public/landing/teal-camp-shirt.webp";
import { BrandWordmark } from "@/components/brand";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";

type Garment = {
  name: string;
  category: string;
  colour: string;
  image: StaticImageData;
  imageClassName: string;
};

const berryChoreJacket: Garment = {
  name: "Berry chore jacket",
  category: "Outerwear",
  colour: "Berry red",
  image: berryJacket,
  imageClassName: "bg-[#eadfce]",
};
const tealCampShirt: Garment = {
  name: "Teal camp shirt",
  category: "Shirts",
  colour: "Deep teal",
  image: tealShirt,
  imageClassName: "bg-peach",
};
const offWhiteCrewTee: Garment = {
  name: "Off-white crew tee",
  category: "T-shirts",
  colour: "Warm white",
  image: offWhiteTee,
  imageClassName: "bg-mist",
};
const stonePleatedTrousers: Garment = {
  name: "Stone pleated trousers",
  category: "Trousers",
  colour: "Stone",
  image: stoneTrousers,
  imageClassName: "bg-peach",
};
const citrusRibbedKnit: Garment = {
  name: "Citrus knit",
  category: "Knitwear",
  colour: "Citrus yellow",
  image: citrusKnit,
  imageClassName: "bg-mist",
};

const outfitGarments = [offWhiteCrewTee, berryChoreJacket, stonePleatedTrousers];
const garments = [
  offWhiteCrewTee,
  tealCampShirt,
  berryChoreJacket,
  stonePleatedTrousers,
  citrusRibbedKnit,
];

function HeroCollage() {
  return (
    <div className="relative mx-auto min-h-[500px] w-full max-w-[570px] sm:min-h-[610px] lg:min-h-[650px]">
      <div className="absolute inset-x-[8%] top-[8%] h-[76%] rotate-2 rounded-[2rem] bg-citrus" />
      <div className="absolute inset-x-[4%] top-[4%] h-[78%] -rotate-2 rounded-[2rem] border-2 border-ink bg-mist" />

      <BlurFade delay={0.12} direction="left" className="absolute left-[2%] top-[10%] w-[58%]">
        <article className="rotate-[-4deg] overflow-hidden rounded-[1.6rem] border-2 border-ink bg-canvas shadow-[8px_8px_0_var(--color-berry)]">
          <Image
            src={berryJacket}
            alt="Berry-red chore jacket laid on cream linen"
            className="aspect-[4/5] w-full object-cover"
            priority
            sizes="(max-width: 640px) 58vw, 330px"
          />
          <div className="border-t-2 border-ink bg-canvas p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-teal">
              Outerwear
            </p>
            <p className="mt-1 text-lg font-bold tracking-[-0.03em]">Berry chore jacket</p>
          </div>
        </article>
      </BlurFade>

      <BlurFade delay={0.22} direction="right" className="absolute right-[2%] top-[4%] w-[40%]">
        <figure className="rotate-[5deg] overflow-hidden rounded-[1.35rem] border-2 border-ink bg-peach shadow-[6px_6px_0_var(--color-teal)]">
          <Image
            src={tealShirt}
            alt="Teal patterned camp shirt laid on peach paper"
            className="aspect-[4/5] w-full object-cover"
            priority
            sizes="(max-width: 640px) 40vw, 230px"
          />
        </figure>
      </BlurFade>

      <BlurFade delay={0.3} direction="up" className="absolute bottom-[4%] right-[4%] w-[44%]">
        <div className="rotate-[-3deg] rounded-[1.35rem] border-2 border-ink bg-canvas p-4 shadow-[6px_6px_0_var(--color-peach)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
              Outfit idea
            </span>
            <span className="grid size-7 place-items-center rounded-full bg-citrus text-ink">
              <ListPlus size={14} />
            </span>
          </div>
          <p className="mt-3 text-sm font-bold leading-snug sm:text-base">
            A relaxed Saturday in town
          </p>
          <div className="mt-4 flex -space-x-2">
            {outfitGarments.map((garment) => (
              <Image
                key={garment.name}
                src={garment.image}
                alt=""
                className="size-11 rounded-full border-2 border-canvas object-cover sm:size-13"
                sizes="52px"
              />
            ))}
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.38} direction="up" className="absolute bottom-[3%] left-[1%]">
        <div className="rotate-2 rounded-full border-2 border-ink bg-teal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-canvas shadow-[3px_3px_0_var(--color-citrus)]">
          Browse all 24 pieces
        </div>
      </BlurFade>
    </div>
  );
}

function GarmentStrip() {
  return (
    <Marquee pauseOnHover className="py-4 [--duration:32s] [--gap:1.25rem]">
      {garments.map((garment) => (
        <article
          key={garment.name}
          className="flex w-[290px] shrink-0 items-center gap-3 rounded-2xl border-2 border-ink bg-canvas p-3 shadow-[4px_4px_0_var(--color-peach)]"
        >
          <Image
            src={garment.image}
            alt=""
            className={`size-20 rounded-xl object-cover ${garment.imageClassName}`}
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

export function LandingPage() {
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
                Request access <ArrowRight size={18} />
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
        <HeroCollage />
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
              wardrobe into an admin job.
            </p>
          </div>
        </BlurFade>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Camera,
              number: "01",
              title: "Start with a photo",
              body: "Add a garment from your phone or computer. Outfitted keeps the image at the centre of the record.",
              colour: "bg-peach",
            },
            {
              icon: Shirt,
              number: "02",
              title: "Keep what matters",
              body: "Name it, describe it and note the colour, material or fit. Leave anything blank when it is not useful.",
              colour: "bg-mist",
            },
            {
              icon: Eye,
              number: "03",
              title: "See the full wardrobe",
              body: "Browse your active pieces as a visual collection and tuck things into the archive when they are out of rotation.",
              colour: "bg-citrus",
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <BlurFade key={item.number} inView delay={index * 0.08} className="h-full">
                <article
                  className={`flex h-full flex-col rounded-[1.75rem] border-2 border-ink p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-7 ${item.colour}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-canvas">
                      <Icon size={22} />
                    </span>
                    <span className="font-mono text-xs font-bold text-ink/45">{item.number}</span>
                  </div>
                  <h3 className="mt-8 text-2xl font-bold tracking-[-0.045em]">{item.title}</h3>
                  <p className="mt-3 leading-7 text-ink/68">{item.body}</p>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </section>

      <section className="bg-teal px-5 py-24 text-canvas sm:px-8 lg:py-32">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
          <BlurFade inView direction="left">
            <div>
              <span className="inline-flex rounded-2xl bg-citrus p-3 text-ink">
                <Layers3 size={24} />
              </span>
              <h2 className="mt-7 text-4xl font-bold leading-[0.95] tracking-[-0.065em] sm:text-6xl">
                A little help, when you want it.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-canvas/72">
                Optional AI can fill in garment details after an upload and suggest an outfit using
                the clothes already in your wardrobe. Every detail stays editable.
              </p>
            </div>
          </BlurFade>

          <BlurFade inView direction="right" delay={0.1}>
            <article className="rounded-[2rem] border-2 border-ink bg-canvas p-5 text-ink shadow-[10px_10px_0_var(--color-citrus)] sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b-2 border-teal/25 pb-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
                    Outfit desk
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-[-0.03em]">
                    A relaxed Saturday in town
                  </h3>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-teal">
                  <ListPlus size={18} />
                </span>
              </div>
              <p className="mt-6 leading-7 text-ink/68">
                Pair the off-white tee with the berry jacket and stone trousers for one simple,
                relaxed outfit.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {outfitGarments.map((garment) => (
                  <figure key={garment.name}>
                    <Image
                      src={garment.image}
                      alt=""
                      className="aspect-[4/5] w-full rounded-xl border-2 border-line object-cover"
                      sizes="(max-width: 640px) 42vw, (max-width: 1024px) 21vw, 125px"
                    />
                    <figcaption className="mt-2 text-xs font-bold leading-tight">
                      {garment.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
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
              Request access with your Google account. Once approved, you can start adding your
              clothes.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-citrus px-6 py-3.5 font-bold text-ink transition hover:-translate-y-0.5 hover:bg-canvas"
          >
            Request access <ArrowRight size={18} />
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
