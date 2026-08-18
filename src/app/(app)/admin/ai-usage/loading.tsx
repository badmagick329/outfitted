import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function AiUsageLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" />
      <div className="mt-7 flex gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <div className="mt-9 space-y-8">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    </LoadingShell>
  );
}
