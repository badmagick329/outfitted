import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function GarmentLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton back action />
      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(30rem,0.9fr)]">
        <div>
          <div className="mb-3 flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-mist)] sm:p-7">
          <Skeleton className="h-8 w-28" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-full" />
        </div>
      </div>
    </LoadingShell>
  );
}
