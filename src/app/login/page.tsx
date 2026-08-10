"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-10 text-ink">
      <div className="w-full max-w-lg rounded-[2rem] border border-ink/15 bg-mist p-7 shadow-[10px_10px_0_var(--color-berry)] sm:p-11">
        <div>
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition hover:text-teal"
          >
            <ArrowLeft size={16} /> Back to Outfitted
          </Link>
          <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.07em] sm:text-6xl">
            Keep your clothes <span className="text-teal">in the picture.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-7 text-ink/65">
            A visual catalogue for the clothes you love, wear, and want to remember.
          </p>
          <Button
            onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
            className="mt-8 w-full"
            size="lg"
          >
            Continue with Google <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </main>
  );
}
