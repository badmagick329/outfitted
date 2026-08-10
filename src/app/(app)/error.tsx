"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MemberError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="max-w-2xl rounded-3xl border border-line bg-peach/55 p-8 shadow-[6px_6px_0_var(--color-citrus)] sm:p-10">
      <span className="inline-flex rounded-2xl bg-berry p-3 text-canvas">
        <AlertTriangle size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-[-0.045em]">This page didn’t load</h1>
      <p className="mt-3 max-w-lg leading-7 text-ink/65">
        Your wardrobe has not been changed. Try loading the page again.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <Link
          href="/wardrobe"
          className="inline-flex h-11 items-center justify-center rounded-full border border-ink/20 px-5 text-sm font-bold transition hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          Back to wardrobe
        </Link>
      </div>
    </section>
  );
}
