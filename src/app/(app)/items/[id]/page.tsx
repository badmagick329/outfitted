/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/item-editor";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

const statusStyles = {
  complete: "border-teal/30 bg-mist text-teal-dark",
  failed: "border-red-300 bg-red-50 text-red-700",
  pending: "border-citrus/80 bg-citrus/40 text-ink",
  processing: "border-citrus/80 bg-citrus/40 text-ink",
};

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const item = await wardrobeService.findOwnedItem(userId, id);
  if (!item) notFound();
  const photos = await wardrobeService.getOwnedPhotos(userId, id);

  return (
    <>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-berry">GARMENT RECORD</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
            {item.name}
          </h1>
          <p className="mt-3 text-ink/65">
            {item.analysisStatus === "complete"
              ? "AI details can be refined below."
              : item.analysisStatus === "failed"
                ? "Analysis needs another try."
                : "We’re reading the details in the background."}
          </p>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide ${statusStyles[item.analysisStatus as keyof typeof statusStyles] ?? statusStyles.pending}`}
        >
          {item.analysisStatus}
        </span>
      </header>
      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(28rem,0.9fr)]">
        <div className="grid grid-cols-2 gap-4 self-start">
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={`/api/photos/${photo.id}`}
              alt={item.name}
              className="w-full rounded-2xl bg-mist object-cover shadow-[4px_4px_0_var(--color-peach)]"
            />
          ))}
        </div>
        <ItemEditor key={`${item.id}-${item.updatedAt.toISOString()}`} item={item} />
      </div>
    </>
  );
}
