import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/member-loading-skeleton";

export default function MemberLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton tone="mist" />
      <Skeleton className="mt-9 h-80 w-full rounded-3xl" />
    </LoadingShell>
  );
}
