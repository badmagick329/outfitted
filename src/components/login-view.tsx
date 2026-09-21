"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import berryJacket from "../../public/landing/berry-chore-jacket.webp";
import offWhiteTee from "../../public/landing/off-white-tee.webp";
import stoneTrousers from "../../public/landing/stone-trousers.webp";
import { BrandWordmark } from "@/components/brand";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import type { AccessMode } from "@/features/access/contracts";

function WardrobeCollage() {
  return (
    <div className="relative mt-10 h-[280px] w-full max-w-[540px] sm:h-[340px] lg:mt-12">
      <div className="absolute inset-x-[6%] bottom-[2%] top-[9%] rotate-2 rounded-[1.75rem] bg-citrus" />
      <figure className="absolute bottom-[4%] left-[1%] w-[52%] -rotate-3 overflow-hidden rounded-[1.5rem] border-2 border-ink bg-canvas shadow-[6px_6px_0_var(--color-berry)]">
        <Image
          src={berryJacket}
          alt="Berry-red chore jacket laid on cream linen"
          className="aspect-[4/5] w-full object-cover"
          priority
          sizes="(max-width: 1024px) 48vw, 300px"
        />
      </figure>
      <figure className="absolute right-[4%] top-[1%] w-[39%] rotate-3 overflow-hidden rounded-[1.25rem] border-2 border-ink bg-mist shadow-[5px_5px_0_var(--color-teal)]">
        <Image
          src={offWhiteTee}
          alt="Off-white crew-neck T-shirt laid on pale blue fabric"
          className="aspect-[4/3] w-full object-cover"
          priority
          sizes="(max-width: 1024px) 38vw, 220px"
        />
      </figure>
      <figure className="absolute bottom-[3%] right-[1%] w-[42%] -rotate-2 overflow-hidden rounded-[1.25rem] border-2 border-ink bg-peach shadow-[5px_5px_0_var(--color-peach)]">
        <Image
          src={stoneTrousers}
          alt="Stone pleated trousers laid on warm sand paper"
          className="aspect-[4/3] w-full object-cover object-[center_38%]"
          priority
          sizes="(max-width: 1024px) 40vw, 235px"
        />
      </figure>
    </div>
  );
}

export function LoginView({ accessMode }: { accessMode: AccessMode }) {
  const isPublic = accessMode === "public";
  return (
    <main className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative flex min-h-[58vh] flex-col overflow-hidden border-b-2 border-ink bg-mist px-5 py-5 sm:px-8 sm:py-7 lg:min-h-screen lg:border-b-0 lg:border-r-2 lg:px-10 xl:px-14">
        <header className="flex items-center justify-between gap-4">
          <BrandWordmark />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition hover:text-teal"
          >
            <ArrowLeft size={16} /> Back home
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center pt-14 sm:pt-16 lg:pt-10">
          <BlurFade delay={0.04}>
            <h1 className="max-w-2xl text-[clamp(3.6rem,7vw,6.7rem)] font-bold leading-[0.86] tracking-[-0.08em]">
              Know what’s in <span className="text-teal">your wardrobe.</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.12}>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
              Photograph and organise your clothes in a private visual catalogue you can browse from
              anywhere.
            </p>
          </BlurFade>
          <BlurFade delay={0.2} direction="up">
            <WardrobeCollage />
          </BlurFade>
        </div>
      </section>

      <section className="grid place-items-center px-5 py-16 sm:px-10 lg:px-12">
        <BlurFade delay={0.1} direction="right" className="w-full max-w-md">
          <div className="rounded-[2rem] border-2 border-ink bg-canvas p-6 shadow-[8px_8px_0_var(--color-peach)] sm:p-9">
            <h2 className="text-4xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-5xl">
              {isPublic ? "Sign in and start." : "Sign in or request access."}
            </h2>
            <p className="mt-5 leading-7 text-ink/65">
              {isPublic
                ? "Sign in with Google and your private wardrobe opens right away."
                : "Already approved? We’ll open your wardrobe. New here? We’ll register your account for approval."}
            </p>

            <Button
              onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
              className="mt-8 w-full"
              size="lg"
            >
              Continue with Google <ArrowRight size={18} />
            </Button>
          </div>
        </BlurFade>
      </section>
    </main>
  );
}
