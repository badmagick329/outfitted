import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { ItemEditor } from "@/components/item-editor";
import { GarmentPhotoGallery } from "@/components/garment-photo-gallery";
import { MemberPageHeader } from "@/components/member-page-header";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { requireActiveUser } from "@/features/access/server";
import { categoryGroupSchema } from "@/features/wardrobe/domain/category-groups";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const fromCategory = categoryGroupSchema.safeParse((await searchParams).fromCategory);
  const wardrobeHref = fromCategory.success
    ? `/wardrobe?category=${encodeURIComponent(fromCategory.data)}`
    : "/wardrobe";
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
            <WardrobeBackLink href={wardrobeHref} />
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
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {["failed", "pending", "processing"].includes(item.analysisStatus) && (
              <MemberStatusBadge status={item.analysisStatus as MemberStatus} />
            )}
            <Link href="/upload" className={buttonVariants()}>
              <Plus size={17} aria-hidden="true" />
              Add another garment
            </Link>
          </div>
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
          wardrobeHref={wardrobeHref}
        />
      </div>
    </>
  );
}
