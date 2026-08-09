/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
import Link from "next/link";
import { Plus, Search, Shirt } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

const statusStyles = {
  failed: "border-red-300 bg-red-50 text-red-700",
  pending: "border-citrus/80 bg-citrus/40 text-ink",
  processing: "border-citrus/80 bg-citrus/40 text-ink",
};

export default async function WardrobePage() {
  const items = await wardrobeService.listActiveCards(await requireUserId());

  return (
    <>
      <header className="flex flex-col justify-between gap-6 rounded-3xl border border-line bg-mist/75 p-6 shadow-[5px_5px_0_var(--color-peach)] sm:flex-row sm:items-end sm:p-8">
        <div>
          <p className="inline-flex rounded-full bg-citrus px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-berry">
            MY INVENTORY
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Your wardrobe</h1>
          <p className="mt-2 text-ink/65">
            {items.length} active {items.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark"
        >
          <Plus size={18} /> Add garment
        </Link>
      </header>

      <div className="mt-9 flex items-center justify-between gap-4 border-y-2 border-teal/25 py-3 text-sm text-ink/60">
        <div className="flex min-w-0 items-center gap-2">
          <Search size={16} className="shrink-0" />
          <span className="font-mono text-xs">Your full collection</span>
        </div>
        <span className="hidden font-mono text-xs sm:block">LIVE CATALOGUE</span>
      </div>

      {items.length ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="group block h-full overflow-hidden rounded-2xl border border-line bg-canvas transition hover:-translate-y-1 hover:border-teal hover:shadow-[5px_5px_0_var(--color-peach)]"
            >
              {item.coverPhotoId ? (
                <img
                  src={`/api/photos/${item.coverPhotoId}`}
                  alt={item.name}
                  className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="aspect-[4/5] bg-mist" />
              )}
              <div className="flex min-w-0 items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <strong className="block break-words text-base leading-tight">{item.name}</strong>
                  <span className="mt-1 block text-sm text-ink/60">
                    {item.category ?? "Processing details"}
                  </span>
                </div>
                {item.analysisStatus !== "complete" && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${statusStyles[item.analysisStatus as keyof typeof statusStyles] ?? statusStyles.pending}`}
                  >
                    {item.analysisStatus}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="mt-10 max-w-xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8 sm:p-10">
          <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
            <Shirt size={24} />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em]">
            Start with a favourite piece
          </h2>
          <p className="mt-2 max-w-md text-ink/65">
            Photograph it from a couple of angles. We’ll turn it into an editable wardrobe record.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas"
          >
            <Plus size={18} /> Add your first garment
          </Link>
        </section>
      )}
    </>
  );
}
