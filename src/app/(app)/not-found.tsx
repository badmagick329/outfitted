import Link from "next/link";
import { Shirt } from "lucide-react";

export default function MemberNotFound() {
  return (
    <section className="max-w-2xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8 sm:p-10">
      <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
        <Shirt size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-[-0.045em]">We couldn’t find that garment</h1>
      <p className="mt-3 max-w-lg leading-7 text-ink/65">
        It may have been removed, or the link may no longer be valid.
      </p>
      <Link
        href="/wardrobe"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
      >
        Back to wardrobe
      </Link>
    </section>
  );
}
