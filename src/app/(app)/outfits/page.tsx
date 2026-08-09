import { OutfitDesk } from "@/components/outfit-desk";
import { requireUserId } from "@/lib/auth";
import { wardrobeService } from "@/features/wardrobe/server";

export default async function OutfitsPage() {
  return (
    <>
      <header className="rounded-3xl border border-line bg-mist/75 p-6 shadow-[5px_5px_0_var(--color-peach)] sm:p-8">
        <p className="inline-flex rounded-full bg-teal px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-canvas">
          OUTFIT DESK
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          Ask your wardrobe
        </h1>
        <p className="mt-3 text-ink/65">Suggestions only draw from what you own.</p>
      </header>
      <OutfitDesk items={await wardrobeService.listActive(await requireUserId())} />
    </>
  );
}
