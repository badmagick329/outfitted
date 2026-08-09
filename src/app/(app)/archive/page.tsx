import Link from "next/link";
import { ArchiveRestore } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function ArchivePage() {
  const items = await wardrobeService.listArchived(await requireUserId());
  return (
    <>
      <header>
        <p className="font-mono text-xs font-bold tracking-[0.18em] text-berry">PAST PIECES</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Archive</h1>
        <p className="mt-3 text-ink/65">Archived pieces are kept out of outfit suggestions.</p>
      </header>
      <section className="mt-9 max-w-3xl space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              href={`/items/${item.id}`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-canvas p-4 transition hover:border-teal hover:bg-mist"
              key={item.id}
            >
              <span className="rounded-xl bg-peach p-3 text-berry">
                <ArchiveRestore size={18} />
              </span>
              <div className="min-w-0">
                <strong className="block break-words">{item.name}</strong>
                <span className="text-sm text-ink/60">{item.category ?? "Garment"}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-teal/40 bg-mist p-8">
            <h2 className="text-xl font-bold">No archived garments</h2>
            <p className="mt-2 text-ink/65">
              Archive pieces you no longer own instead of losing their record.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
