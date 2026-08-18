import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function UploadLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="peach" back />
      <Skeleton className="mt-9 h-28 max-w-3xl rounded-2xl" />
      <div className="mt-9 max-w-4xl rounded-3xl border border-line bg-canvas p-5 sm:p-8">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
      </div>
    </LoadingShell>
  );
}
