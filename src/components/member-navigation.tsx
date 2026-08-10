"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  ChevronDown,
  CircleUserRound,
  Layers3,
  ShieldCheck,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";

type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
  available: (access: { canUseAi: boolean; isAdmin: boolean }) => boolean;
  matches: (pathname: string) => boolean;
  activeClassName: string;
};

const destinations: Destination[] = [
  {
    href: "/wardrobe",
    label: "Wardrobe",
    icon: Shirt,
    available: () => true,
    matches: (pathname) =>
      pathname.startsWith("/wardrobe") ||
      pathname.startsWith("/items") ||
      pathname.startsWith("/upload"),
    activeClassName: "bg-peach text-berry-dark",
  },
  {
    href: "/outfits",
    label: "Outfit Desk",
    icon: Layers3,
    available: ({ canUseAi }) => canUseAi,
    matches: (pathname) => pathname.startsWith("/outfits"),
    activeClassName: "bg-mist text-teal-dark",
  },
  {
    href: "/archive",
    label: "Archive",
    icon: Archive,
    available: () => true,
    matches: (pathname) => pathname.startsWith("/archive"),
    activeClassName: "bg-citrus/45 text-ink",
  },
  {
    href: "/admin/users",
    label: "Admin",
    icon: ShieldCheck,
    available: ({ isAdmin }) => isAdmin,
    matches: (pathname) => pathname.startsWith("/admin"),
    activeClassName: "bg-peach text-berry-dark",
  },
];

function NavigationLinks({
  canUseAi,
  isAdmin,
  mobile = false,
}: {
  canUseAi: boolean;
  isAdmin: boolean;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const visibleDestinations = destinations.filter((destination) =>
    destination.available({ canUseAi, isAdmin }),
  );

  return visibleDestinations.map(({ href, label, icon: Icon, matches, activeClassName }) => {
    const active = matches(pathname);

    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          mobile
            ? `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center text-[10px] font-bold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${active ? activeClassName : "text-ink/60 hover:bg-peach/60 hover:text-ink"}`
            : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${active ? activeClassName : "text-ink/70 hover:bg-peach/60 hover:text-ink"}`
        }
      >
        <Icon size={mobile ? 18 : 17} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  });
}

function MobileAccountMenu({ name, email }: { name: string | null; email: string }) {
  return (
    <details className="group relative lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-xl px-2 py-2 text-ink/65 transition hover:bg-peach hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry [&::-webkit-details-marker]:hidden">
        <CircleUserRound size={20} aria-hidden="true" />
        <ChevronDown size={14} aria-hidden="true" className="transition group-open:rotate-180" />
        <span className="sr-only">Open account menu</span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-2xl border border-line bg-canvas p-3 shadow-[5px_5px_0_var(--color-peach)]">
        <div className="border-b border-line px-2 pb-3">
          <strong className="block break-words text-sm">{name ?? "Your wardrobe"}</strong>
          <span className="mt-0.5 block break-all text-xs text-ink/60">{email}</span>
        </div>
        <SignOutButton className="mt-2 w-full justify-start" />
      </div>
    </details>
  );
}

export function MemberNavigation({
  canUseAi,
  isAdmin,
  name,
  email,
}: {
  canUseAi: boolean;
  isAdmin: boolean;
  name: string | null;
  email: string;
}) {
  return (
    <>
      <aside className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur lg:h-screen lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <Link
          href="/wardrobe"
          className="flex items-center gap-2 font-bold tracking-[-0.06em] focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          aria-label="Outfitted wardrobe"
        >
          <BrandMark className="size-8" />
          <span className="text-lg">Outfitted</span>
        </Link>

        <nav className="mt-14 hidden gap-1 lg:grid" aria-label="Member navigation">
          <NavigationLinks canUseAi={canUseAi} isAdmin={isAdmin} />
        </nav>

        <MobileAccountMenu name={name} email={email} />

        <div className="mt-auto hidden items-start gap-3 border-t border-line pt-5 lg:flex">
          <CircleUserRound size={20} className="mt-1 shrink-0 text-teal" aria-hidden="true" />
          <div className="min-w-0">
            <strong className="block break-words text-sm">{name ?? "Your wardrobe"}</strong>
            <span className="mt-0.5 block break-all text-xs text-ink/55">{email}</span>
            <SignOutButton className="-ml-3 mt-1" />
          </div>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
        aria-label="Member navigation"
      >
        <div className="mx-auto grid max-w-md grid-flow-col auto-cols-fr gap-1">
          <NavigationLinks canUseAi={canUseAi} isAdmin={isAdmin} mobile />
        </div>
      </nav>
    </>
  );
}
