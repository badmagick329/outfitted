"use client";

import { signIn } from "next-auth/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-10 text-ink">
      <div className="relative w-full max-w-lg rounded-[2rem] border border-ink/15 bg-mist p-7 shadow-[10px_10px_0_var(--color-berry)] sm:p-11">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-citrus/80" />
        <div className="relative">
          <span className="inline-flex rounded-2xl bg-berry p-3 text-citrus">
            <Sparkles size={22} />
          </span>
          <p className="mt-6 font-mono text-xs font-bold tracking-[0.18em] text-berry">
            PRIVATE WARDROBE
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[0.95] tracking-[-0.07em] sm:text-6xl">
            Keep your clothes <span className="text-teal">in the picture.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-7 text-ink/65">
            A lively, personal visual catalogue for the pieces you already own.
          </p>
          <Button
            onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
            className="mt-8 w-full"
            size="lg"
          >
            Continue with Google <ArrowRight size={18} />
          </Button>
          <p className="mt-5 text-center text-sm text-ink/55">
            Your wardrobe is private to your account.
          </p>
        </div>
      </div>
    </main>
  );
}
