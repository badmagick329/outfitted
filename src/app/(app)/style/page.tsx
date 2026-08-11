import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/member-page-header";
import { StyleProfileForm } from "@/components/style-profile-form";
import { requireActiveUser } from "@/features/access/server";
import { getStyleProfile } from "@/features/style-profile/server";

export default async function StylePage() {
  const access = await requireActiveUser();
  if (!access.canUseAi) redirect("/wardrobe");
  const profile = await getStyleProfile(access.userId);

  return (
    <>
      <MemberPageHeader
        title="Your style"
        description={
          <p>
            Share a few optional notes about how you like to dress. Outfit Desk will take them into
            account when it puts a look together.
          </p>
        }
        tone="peach"
      />
      <StyleProfileForm initialProfile={profile} />
    </>
  );
}
