import { OutfitDesk } from "@/components/outfit-desk";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function OutfitsPage() {
  return (
    <>
      <header>
        <p className="font-mono text-xs font-bold tracking-[0.18em] text-berry">OUTFIT DESK</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          Ask your wardrobe
        </h1>
        <p className="mt-3 text-ink/65">Suggestions only draw from what you own.</p>
      </header>
      <OutfitDesk items={await wardrobeService.listActive(await requireUserId())} />
    </>
  );
}
