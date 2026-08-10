import { MemberPageHeader } from "@/components/member-page-header";
import { OutfitDesk } from "@/components/outfit-desk";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/features/access/server";
import { outfitService } from "@/features/outfits/server";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function OutfitsPage() {
  const access = await requireActiveUser();
  if (!access.canUseAi) redirect("/wardrobe");
  const [items, archivedItems, savedOutfits] = await Promise.all([
    wardrobeService.listActiveCards(access.userId),
    wardrobeService.listArchivedCards(access.userId),
    outfitService.listSaved(access.userId),
  ]);
  const toOutfitItem = ({ id, name, category, coverPhotoId }: (typeof items)[number]) => ({
    id,
    name,
    category,
    coverPhotoId,
  });

  return (
    <>
      <MemberPageHeader
        title="Ask your wardrobe"
        description={<p>Tell us the plan and we’ll put a look together.</p>}
        backLink={<WardrobeBackLink />}
        tone="mist"
      />
      <OutfitDesk
        items={items.map(toOutfitItem)}
        catalogueItems={[...items, ...archivedItems].map(toOutfitItem)}
        initialSavedOutfits={savedOutfits.map(({ saved, suggestion }) => ({
          id: saved.id,
          suggestionId: saved.suggestionId,
          name: saved.name,
          createdAt: saved.createdAt.toISOString(),
          recommendation: suggestion.recommendation,
          rationale: suggestion.rationale,
          referencedItemIds: suggestion.selectedItemIds,
        }))}
      />
    </>
  );
}
