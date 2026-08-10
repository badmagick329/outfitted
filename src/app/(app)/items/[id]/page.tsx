import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/item-editor";
import { GarmentPhotoGallery } from "@/components/garment-photo-gallery";
import { MemberPageHeader } from "@/components/member-page-header";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const access = await requireActiveUser();
  const userId = access.userId;
  const item = await wardrobeService.findOwnedItem(userId, id);
  if (!item) notFound();
  const photos = await wardrobeService.getOwnedPhotos(userId, id);

  return (
    <>
      <MemberPageHeader
        title={item.name || "Untitled garment"}
        backLink={
          item.archivedAt ? (
            <WardrobeBackLink href="/archive" label="Back to archive" />
          ) : (
            <WardrobeBackLink />
          )
        }
        description={
          ["complete", "failed", "pending", "processing"].includes(item.analysisStatus) ? (
            <p>
              {item.analysisStatus === "complete"
                ? "Review and edit the details below."
                : item.analysisStatus === "failed"
                  ? "The garment details need another look."
                  : "We’re reading the details in the background."}
            </p>
          ) : undefined
        }
        status={
          ["failed", "pending", "processing"].includes(item.analysisStatus) ? (
            <MemberStatusBadge status={item.analysisStatus as MemberStatus} />
          ) : undefined
        }
      />
      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(30rem,0.9fr)]">
        <GarmentPhotoGallery
          itemName={item.name}
          photos={photos.map((photo) => ({ id: photo.id, src: `/api/photos/${photo.id}` }))}
        />
        <ItemEditor
          item={{
            ...item,
            archivedAt: item.archivedAt?.toISOString() ?? null,
            updatedAt: item.updatedAt.toISOString(),
          }}
          canUseAi={access.canUseAi}
        />
      </div>
    </>
  );
}
