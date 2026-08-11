import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/member-page-header";
import { WardrobeReviewPanel } from "@/components/wardrobe-review-panel";
import { requireActiveUser } from "@/features/access/server";
import { wardrobeReviewService } from "@/features/wardrobe-review/server";

export default async function WardrobeReviewPage() {
  const access = await requireActiveUser();
  if (!access.canUseAi) redirect("/wardrobe");
  const initialView = await wardrobeReviewService.getView(access.userId);

  return (
    <>
      <MemberPageHeader
        title="Wardrobe review"
        description={
          <p>See what your wardrobe already covers and where a useful gap might exist.</p>
        }
        tone="mist"
      />
      <WardrobeReviewPanel initialView={initialView} />
    </>
  );
}
