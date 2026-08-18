import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function StyleLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="peach" />
      <div className="mt-9 max-w-4xl">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-3xl border border-line p-5 sm:p-6">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-3 h-32 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-16 w-full rounded-2xl" />
      </div>
    </LoadingShell>
  );
}
