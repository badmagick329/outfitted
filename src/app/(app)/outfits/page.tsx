import { MemberPageHeader } from "@/components/member-page-header";
import { OutfitDesk } from "@/components/outfit-desk";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/features/access/server";
import { outfitService } from "@/features/outfits/server";
import { getStyleProfile } from "@/features/style-profile/server";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function OutfitsPage({ searchParams }: PageProps<"/outfits">) {
  const access = await requireActiveUser();
  if (!access.canUseAi) redirect("/wardrobe");
  const [items, archivedItems, savedOutfits, styleProfile] = await Promise.all([
    wardrobeService.listActiveCards(access.userId),
    wardrobeService.listArchivedCards(access.userId),
    outfitService.listSaved(access.userId),
    getStyleProfile(access.userId),
  ]);
  const toOutfitItem = ({ id, name, category, coverPhotoId }: (typeof items)[number]) => ({
    id,
    name,
    category,
    coverPhotoId,
  });
  const requestedItemId = (await searchParams).item;
  const initialStartingItem =
    typeof requestedItemId === "string"
      ? (items.find((item) => item.id === requestedItemId && !item.excludedFromOutfitSuggestions) ??
        null)
      : null;
  const eligibleItems = items.filter((item) => !item.excludedFromOutfitSuggestions);

  return (
    <>
      <MemberPageHeader
        title="Ask your wardrobe"
        description={<p>Describe the occasion, and we’ll suggest an outfit from your wardrobe.</p>}
        backLink={<WardrobeBackLink />}
        tone="mist"
      />
      <OutfitDesk
        items={eligibleItems.map(toOutfitItem)}
        catalogueItems={[...items, ...archivedItems].map(toOutfitItem)}
        hasStyleProfile={Boolean(styleProfile)}
        initialStartingItem={initialStartingItem ? toOutfitItem(initialStartingItem) : null}
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
