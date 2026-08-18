import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function AdminUsersLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="peach" />
      <div className="mt-7 flex gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <section className="mt-9 overflow-hidden rounded-3xl border border-line bg-canvas">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid gap-4 border-b border-line p-5 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:px-7"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
        ))}
      </section>
    </LoadingShell>
  );
}
