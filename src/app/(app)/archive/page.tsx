import { ArchivedGarmentCard } from "@/components/archived-garment-card";
import { MemberPageHeader } from "@/components/member-page-header";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function ArchivePage() {
  const items = await wardrobeService.listArchivedCards((await requireActiveUser()).userId);
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <MemberPageHeader
        title="Archive"
        description={<p>Archived pieces are kept out of outfit suggestions.</p>}
        backLink={<WardrobeBackLink />}
      />
      <section className="mt-9">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ArchivedGarmentCard
                key={item.id}
                id={item.id}
                name={item.name}
                category={item.category}
                coverPhotoId={item.coverPhotoId}
                photoCount={item.photoCount}
                archivedLabel={dateFormatter.format(item.archivedAt!)}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8">
            <h2 className="text-xl font-bold">No archived garments</h2>
            <p className="mt-2 text-ink/65">
              Anything you move out of rotation will stay here until you restore it.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
