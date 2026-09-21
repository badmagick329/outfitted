import { redirect } from "next/navigation";
import { Layers3, ListChecks, Palette, Sparkles, Wand2, type LucideIcon } from "lucide-react";
import { AiAccessRequestPanel } from "@/components/ai-access-request-panel";
import { MemberPageHeader } from "@/components/member-page-header";
import { requireActiveUser } from "@/features/access/server";
import { aiAccessService } from "@/features/ai-access/server";

const capabilities: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Wand2,
    title: "Automatic garment details",
    description:
      "Upload a photo and we fill in the name, colour, material and other details for you.",
  },
  {
    icon: Layers3,
    title: "Outfit Desk suggestions",
    description: "Describe an occasion and get an outfit suggestion drawn from your wardrobe.",
  },
  {
    icon: Palette,
    title: "Style profile",
    description: "Capture your preferences so suggestions and reviews fit you better.",
  },
  {
    icon: ListChecks,
    title: "Wardrobe review",
    description: "See the strengths, gaps and patterns across the wardrobe you’ve built.",
  },
];

export default async function AiAccessPage() {
  const access = await requireActiveUser();
  if (access.canUseAi) redirect("/outfits");
  const latestRequest = await aiAccessService.getLatestForUser(access.userId);
  // A resolved-non-declined latest request (for example after a manual revocation)
  // is treated as no request so the member can ask again.
  const requestStatus =
    latestRequest?.status === "pending" || latestRequest?.status === "declined"
      ? latestRequest.status
      : null;

  return (
    <>
      <MemberPageHeader
        title="AI features"
        description={
          <p>
            AI features are optional. Ask for access and an administrator will review your request.
          </p>
        }
        tone="mist"
      />

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="AI capabilities">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">What AI features include</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-line bg-canvas/65 p-5">
                <span className="inline-flex rounded-xl bg-peach/60 p-2 text-berry-dark">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <strong className="mt-3 block">{title}</strong>
                <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-line bg-canvas/65 p-6">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55">
            <Sparkles size={14} aria-hidden="true" />
            Request access
          </span>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Your wardrobe keeps working exactly as it does today. AI features switch on once a
            request is approved.
          </p>
          <div className="mt-5">
            <AiAccessRequestPanel status={requestStatus} />
          </div>
        </aside>
      </div>
    </>
  );
}
