import { OutfitDesk } from "@/components/outfit-desk";
import { requireUserId } from "@/lib/auth";
import { getActiveItems } from "@/lib/wardrobe";
export default async function OutfitsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">OUTFIT DESK</p>
          <h1>Ask your wardrobe</h1>
          <p className="muted">Suggestions only draw from what you own.</p>
        </div>
      </header>
      <OutfitDesk items={await getActiveItems(await requireUserId())} />
    </>
  );
}
