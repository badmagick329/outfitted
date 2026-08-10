/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import { MemberPageHeader } from "@/components/member-page-header";
import { MemberStatusBadge, type MemberStatus } from "@/components/member-status-badge";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function WardrobePage() {
  const items = await wardrobeService.listActiveCards((await requireActiveUser()).userId);

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
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          >
            <Plus size={18} aria-hidden="true" /> Add garment
          </Link>
        }
        tone="mist"
      />

      {items.length ? (
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const status = ["failed", "pending", "processing"].includes(item.analysisStatus)
              ? (item.analysisStatus as MemberStatus)
              : null;
            const hasVisibleDetails = Boolean(item.name || item.category);
            const accessibleName = item.name || item.category || "garment";

            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                aria-label={`Open ${accessibleName}${item.name && item.category ? `, ${item.category}` : ""}`}
                className="group block h-full overflow-hidden rounded-2xl border border-line bg-canvas transition hover:-translate-y-1 hover:border-teal hover:shadow-[5px_5px_0_var(--color-peach)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
              >
                {item.coverPhotoId ? (
                  <img
                    src={`/api/photos/${item.coverPhotoId}`}
                    alt={item.name || item.category || "Garment"}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid aspect-[4/5] place-items-center bg-mist text-teal/45">
                    <Shirt size={36} aria-hidden="true" />
                  </div>
                )}
                {(hasVisibleDetails || status) && (
                  <div className="flex min-w-0 items-start justify-between gap-3 p-4">
                    {hasVisibleDetails && (
                      <div className="min-w-0">
                        {item.name && (
                          <strong className="block break-words text-base leading-tight">
                            {item.name}
                          </strong>
                        )}
                        {item.category && (
                          <span className={`${item.name ? "mt-1" : ""} block text-sm text-ink/60`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                    )}
                    {status && <MemberStatusBadge status={status} compact />}
                  </div>
                )}
              </Link>
            );
          })}
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
            Start with one clear photo. We’ll turn it into an editable wardrobe record.
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
