import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function OutfitsLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" back />
      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(24rem,1.2fr)]">
        <section className="rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-peach)] sm:p-7">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-5 h-28 w-full rounded-xl" />
          <Skeleton className="mt-5 h-11 w-full rounded-full" />
        </section>
        <section className="rounded-3xl border border-line bg-mist/55 p-5 sm:p-7">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-5 h-48 w-full rounded-2xl" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          </div>
        </section>
      </div>
    </LoadingShell>
  );
}
