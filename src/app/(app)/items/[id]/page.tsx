import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/item-editor";
import { GarmentPhotoGallery } from "@/components/garment-photo-gallery";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

const statusStyles = {
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
          <WardrobeBackLink />
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-berry">GARMENT RECORD</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
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
        {item.analysisStatus !== "complete" && (
          <span
            className={`w-fit shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide ${statusStyles[item.analysisStatus as keyof typeof statusStyles] ?? statusStyles.pending}`}
          >
            {item.analysisStatus}
          </span>
        )}
      </header>
      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(30rem,0.9fr)]">
        <GarmentPhotoGallery
          itemName={item.name}
          photos={photos.map((photo) => ({ id: photo.id, src: `/api/photos/${photo.id}` }))}
        />
        <ItemEditor key={`${item.id}-${item.updatedAt.toISOString()}`} item={item} />
      </div>
    </>
  );
}
