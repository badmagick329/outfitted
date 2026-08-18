import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function ReviewLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" />
      <div className="mt-9 space-y-8">
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
