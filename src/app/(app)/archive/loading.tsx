import {
  CardGridSkeleton,
  HeaderSkeleton,
  LoadingShell,
} from "@/components/member-loading-skeleton";

export default function ArchiveLoading() {
  return (
    <LoadingShell>
      <HeaderSkeleton back />
      <CardGridSkeleton
        cards={8}
        className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      />
    </LoadingShell>
  );
}
