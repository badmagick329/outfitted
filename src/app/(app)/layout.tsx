import { redirect } from "next/navigation";
import { AnalysisStatusProvider } from "@/components/analysis-status-poller";
import { MemberNavigation } from "@/components/member-navigation";
import { UploadDraftProvider } from "@/components/upload-draft-provider";
import { getCurrentAccess } from "@/features/access/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentAccess();
  if (!access) redirect("/login");
  if (access.accessStatus !== "active") redirect("/access");
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <AnalysisStatusProvider enabled={access.canUseAi}>
        <UploadDraftProvider>
          <MemberNavigation
            canUseAi={access.canUseAi}
            isAdmin={access.isAdmin}
            name={access.name}
            email={access.email}
          />
          <section className="mx-auto w-full max-w-7xl px-5 pb-28 pt-9 sm:px-8 lg:px-12 lg:py-12">
            {children}
          </section>
        </UploadDraftProvider>
      </AnalysisStatusProvider>
    </div>
  );
}
