import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Layers3, Plus } from "lucide-react";
import { ItemEditor } from "@/components/item-editor";
import { GarmentPhotoGallery } from "@/components/garment-photo-gallery";
import { MemberPageHeader } from "@/components/member-page-header";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { requireActiveUser } from "@/features/access/server";
import {
  filterWardrobeItems,
  parseWardrobeReturnTo,
  validatedWardrobeReturnTo,
  wardrobeFacets,
  wardrobeItemNavigation,
} from "@/features/wardrobe/domain/filters";
import { styleTagVocabulary } from "@/features/wardrobe/domain/metadata";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const wardrobeHref = validatedWardrobeReturnTo((await searchParams).returnTo);
  const access = await requireActiveUser();
  const userId = access.userId;
  const item = await wardrobeService.findOwnedItem(userId, id);
  if (!item) notFound();
  const [photos, activeItems] = await Promise.all([
    wardrobeService.getOwnedPhotos(userId, id),
    wardrobeService.listActive(userId),
  ]);
  const filteredItems = filterWardrobeItems(
    activeItems,
    parseWardrobeReturnTo(wardrobeHref, wardrobeFacets(activeItems)),
  );
  const navigation = item.archivedAt
    ? null
    : (wardrobeItemNavigation(filteredItems, item.id) ??
      wardrobeItemNavigation(activeItems, item.id));
  const itemHref = (itemId: string) =>
    `/items/${itemId}?returnTo=${encodeURIComponent(wardrobeHref)}`;

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
            {access.canUseAi && !item.archivedAt && !item.excludedFromOutfitSuggestions && (
              <Link
                href={`/outfits?item=${item.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Layers3 size={17} aria-hidden="true" />
                Build an outfit around this
              </Link>
            )}
            <Link href="/upload" className={buttonVariants()}>
              <Plus size={17} aria-hidden="true" />
              Add another garment
            </Link>
          </div>
        }
      />
      {navigation && (
        <nav
          className="mt-6 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-line bg-mist/55 p-2 text-sm"
          aria-label="Garment navigation"
        >
          {navigation.previousItemId ? (
            <Link
              href={itemHref(navigation.previousItemId)}
              className="inline-flex min-w-0 items-center justify-start gap-1.5 rounded-xl px-2 py-2 font-bold text-teal transition hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Previous
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-2 font-bold text-ink/35"
              aria-disabled="true"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Previous
            </span>
          )}
          <span className="whitespace-nowrap px-2 font-mono text-xs text-ink/60">
            {navigation.index + 1} of {navigation.total}
          </span>
          {navigation.nextItemId ? (
            <Link
              href={itemHref(navigation.nextItemId)}
              className="inline-flex min-w-0 items-center justify-end gap-1.5 rounded-xl px-2 py-2 font-bold text-teal transition hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              Next <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <span
              className="inline-flex items-center justify-end gap-1.5 px-2 py-2 font-bold text-ink/35"
              aria-disabled="true"
            >
              Next <ArrowRight size={15} aria-hidden="true" />
            </span>
          )}
        </nav>
      )}
      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(30rem,0.9fr)]">
        <GarmentPhotoGallery
          itemId={item.id}
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
          styleTagSuggestions={styleTagVocabulary(activeItems).map((entry) => entry.value)}
        />
      </div>
    </>
  );
}
