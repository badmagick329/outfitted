export default function MemberLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className="animate-pulse motion-reduce:animate-none"
    >
      <div className="h-44 rounded-3xl border border-line bg-mist/70 shadow-[5px_5px_0_var(--color-peach)]" />
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl border border-line bg-canvas">
            <div className="aspect-[4/3] bg-mist" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-2/3 rounded bg-peach/70" />
              <div className="h-3 w-1/3 rounded bg-mist" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your wardrobe</span>
    </div>
  );
}
