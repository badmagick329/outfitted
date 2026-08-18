import {
  CardGridSkeleton,
  HeaderSkeleton,
  LoadingShell,
  Skeleton,
} from "@/components/member-loading-skeleton";

export default function WardrobeLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" action />
      <div className="mt-7">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-14 rounded-full" />
          <Skeleton className="h-10 w-16 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
      <CardGridSkeleton />
    </LoadingShell>
  );
}
