import type { ReactNode } from "react";

export function LoadingShell({ children }: { children: ReactNode }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className="animate-pulse motion-reduce:animate-none"
    >
      {children}
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded bg-mist ${className}`} />;
}

export function HeaderSkeleton({
  tone = "plain",
  back = false,
  action = false,
}: {
  tone?: "plain" | "mist" | "peach";
  back?: boolean;
  action?: boolean;
}) {
  const panel =
    tone === "plain"
      ? ""
      : tone === "mist"
        ? "rounded-3xl border border-line bg-mist/75 p-6 shadow-[5px_5px_0_var(--color-peach)] sm:p-8"
        : "rounded-3xl border border-line bg-peach/65 p-6 shadow-[5px_5px_0_var(--color-citrus)] sm:p-8";
  return (
    <header className={`flex flex-col justify-between gap-5 sm:flex-row sm:items-end ${panel}`}>
      <div className="min-w-0">
        {back && <Skeleton className="h-4 w-28" />}
        <Skeleton className={`${back ? "mt-5" : ""} h-11 w-60 sm:h-14 sm:w-80`} />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      </div>
      {action && (
        <div className="flex shrink-0 gap-3">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      )}
    </header>
  );
}

export function CardGridSkeleton({
  cards = 10,
  className = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={`mt-5 grid gap-3 sm:gap-4 ${className}`}>
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-line bg-canvas">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
