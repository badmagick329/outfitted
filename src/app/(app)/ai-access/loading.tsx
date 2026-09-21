import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function AiAccessLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" />
      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-line bg-canvas/65 p-5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-line bg-canvas/65 p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-12 w-full" />
        </div>
      </div>
    </LoadingShell>
  );
}
