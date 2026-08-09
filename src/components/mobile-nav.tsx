"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Shirt, Sparkles } from "lucide-react";

const destinations = [
  {
    href: "/wardrobe",
    label: "Wardrobe",
    icon: Shirt,
    matches: (path: string) =>
      path.startsWith("/wardrobe") || path.startsWith("/items") || path.startsWith("/upload"),
  },
  {
    href: "/outfits",
    label: "Outfits",
    icon: Sparkles,
    matches: (path: string) => path.startsWith("/outfits"),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: Archive,
    matches: (path: string) => path.startsWith("/archive"),
  },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {destinations.map(({ href, label, icon: Icon, matches }) => {
          const active = matches(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition ${active ? "bg-mist text-teal" : "text-ink/60 hover:bg-peach"}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
