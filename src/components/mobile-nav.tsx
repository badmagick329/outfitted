"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ShieldCheck, Shirt, Sparkles } from "lucide-react";

const coreDestinations = [
  {
    href: "/wardrobe",
    label: "Wardrobe",
    icon: Shirt,
    matches: (path: string) =>
      path.startsWith("/wardrobe") || path.startsWith("/items") || path.startsWith("/upload"),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: Archive,
    matches: (path: string) => path.startsWith("/archive"),
  },
];

export function MobileNav({ canUseAi, isAdmin }: { canUseAi: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const destinations = [
    ...coreDestinations.slice(0, 1),
    ...(canUseAi
      ? [
          {
            href: "/outfits",
            label: "Outfits",
            icon: Sparkles,
            matches: (path: string) => path.startsWith("/outfits"),
          },
        ]
      : []),
    ...coreDestinations.slice(1),
    ...(isAdmin
      ? [
          {
            href: "/admin/users",
            label: "Admin",
            icon: ShieldCheck,
            matches: (path: string) => path.startsWith("/admin"),
          },
        ]
      : []),
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-flow-col auto-cols-fr gap-1">
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
