import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, CircleUserRound, ShieldCheck, Shirt, Sparkles } from "lucide-react";
import { AnalysisStatusPoller } from "@/components/analysis-status-poller";
import { BrandMark } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentAccess } from "@/features/access/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentAccess();
  if (!access) redirect("/login");
  if (access.accessStatus !== "active") redirect("/access");
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {access.canUseAi && <AnalysisStatusPoller />}
      <MobileNav canUseAi={access.canUseAi} isAdmin={access.isAdmin} />
      <aside className="sticky top-0 z-10 flex h-auto items-center justify-between border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <Link href="/wardrobe" className="flex items-center gap-2 font-bold tracking-[-0.06em]">
          <BrandMark className="size-8" />
          <span className="text-lg">Outfitted</span>
        </Link>
        <nav className="hidden gap-1 lg:mt-14 lg:grid">
          <Link
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-peach"
            href="/wardrobe"
          >
            <Shirt size={17} /> Wardrobe
          </Link>
          {access.canUseAi && (
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-mist"
              href="/outfits"
            >
              <Sparkles size={17} /> Outfit desk
            </Link>
          )}
          <Link
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-citrus"
            href="/archive"
          >
            <Archive size={17} /> Archive
          </Link>
          {access.isAdmin && (
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-peach"
              href="/admin/users"
            >
              <ShieldCheck size={17} /> Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 lg:mt-auto lg:border-t lg:border-line lg:pt-5">
          <CircleUserRound size={19} />
          <div className="hidden lg:block">
            <strong className="block text-sm">{access.name ?? "Your wardrobe"}</strong>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <section className="mx-auto w-full max-w-7xl px-5 pb-28 pt-9 sm:px-8 lg:px-12 lg:py-12">
        {children}
      </section>
    </div>
  );
}
