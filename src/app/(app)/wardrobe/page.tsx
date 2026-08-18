import Link from "next/link";
import { Images, Plus, Shirt } from "lucide-react";
import { MemberPageHeader } from "@/components/member-page-header";
import { WardrobeGrid } from "@/components/wardrobe-grid";
import { ReanalyseAllAction } from "@/components/reanalyse-all-action";
import { requireActiveUser } from "@/features/access/server";
import { hasAvailableFeatureGrant } from "@/features/feature-grants/server";
import { parseWardrobeFilters, wardrobeFacets } from "@/features/wardrobe/domain/filters";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function WardrobePage({ searchParams }: PageProps<"/wardrobe">) {
  const access = await requireActiveUser();
  const items = await wardrobeService.listActiveCards(access.userId);
  const eligibleCount = items.filter(
    (item) => item.analysisStatus !== "pending" && item.analysisStatus !== "processing",
  ).length;
  const canReanalyse =
    access.isAdmin ||
    (access.canUseAi &&
      (await hasAvailableFeatureGrant(access.userId, "bulk_wardrobe_reanalysis")));
  const facets = wardrobeFacets(items);
  const filters = parseWardrobeFilters(await searchParams, facets);

  return (
    <>
      <MemberPageHeader
        title="Your wardrobe"
        description={
          <p>
            {items.length} active {items.length === 1 ? "piece" : "pieces"}
          </p>
        }
        action={
          <div className="flex flex-wrap gap-3">
            {canReanalyse && (
              <ReanalyseAllAction activeCount={items.length} eligibleCount={eligibleCount} />
            )}
            <Link
              href="/upload/batch"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal/30 bg-canvas px-5 py-3 text-sm font-bold text-teal transition hover:border-teal hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              <Images size={18} aria-hidden="true" /> Import several
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              <Plus size={18} aria-hidden="true" /> Add garment
            </Link>
          </div>
        }
        tone="mist"
      />

      {items.length ? (
        <WardrobeGrid
          filters={filters}
          facets={facets}
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            categoryGroup: item.categoryGroup,
            styleTags: item.styleTags,
            analysisStatus: item.analysisStatus,
            coverPhotoId: item.coverPhotoId,
            photoCount: item.photoCount,
          }))}
        />
      ) : (
        <section className="mt-10 max-w-xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8 sm:p-10">
          <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
            <Shirt size={24} />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em]">
            Start with a favourite piece
          </h2>
          <p className="mt-2 max-w-md text-ink/65">
            Start with one clear photo. We’ll turn it into an editable wardrobe record.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)]"
            >
              <Plus size={18} aria-hidden="true" /> Add your first garment
            </Link>
            <Link
              href="/upload/batch"
              className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-canvas px-5 py-3 text-sm font-bold text-teal"
            >
              <Images size={18} aria-hidden="true" /> Import several
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
