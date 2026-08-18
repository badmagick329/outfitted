import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function BatchUploadLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="peach" back />
      <div className="mt-9 max-w-5xl rounded-3xl border border-line bg-canvas p-5 sm:p-8">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
      </div>
    </LoadingShell>
  );
}
