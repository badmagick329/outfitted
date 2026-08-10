import Link from "next/link";
import { Shirt } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-berry text-canvas shadow-[2px_2px_0_var(--color-citrus)] ${className}`}
      aria-hidden="true"
    >
      <Shirt className="size-[53%]" strokeWidth={2.4} />
    </span>
  );
}

export function BrandWordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Outfitted home">
      <BrandMark />
      <span className="text-xl font-bold tracking-[-0.05em]">Outfitted</span>
    </Link>
  );
}
