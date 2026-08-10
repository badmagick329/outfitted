import { redirect } from "next/navigation";
import { Clock3, ShieldOff } from "lucide-react";
import { AccessStatusActions } from "@/components/access-status-actions";
import { BrandWordmark } from "@/components/brand";
import { getCurrentAccess } from "@/features/access/server";

export default async function AccessPage() {
  const access = await getCurrentAccess();
  if (!access) redirect("/login");
  if (access.accessStatus === "active") redirect("/wardrobe");
  const disabled = access.accessStatus === "disabled";
  return (
    <main className="min-h-screen bg-canvas px-5 py-8 text-ink sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <BrandWordmark />
        <section className="mt-16 w-full max-w-xl self-center rounded-[2rem] border border-line bg-mist p-8 shadow-[9px_9px_0_var(--color-peach)] sm:p-11">
          <span className="inline-flex rounded-2xl bg-berry p-3 text-citrus">
            {disabled ? (
              <ShieldOff size={23} aria-hidden="true" />
            ) : (
              <Clock3 size={23} aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-[-0.06em]">
            {disabled ? "Access is paused" : "Access request received"}
          </h1>
          <p className="mt-4 text-lg leading-7 text-ink/65">
            {disabled
              ? "Your access has been paused. Your wardrobe is safely retained; contact the app administrator if you think this is a mistake."
              : "An administrator will review your request. We’ll open your private wardrobe as soon as it is approved."}
          </p>
          <div className="mt-7 rounded-2xl border border-teal/15 bg-canvas/70 px-4 py-3">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-teal">
              Signed in as
            </span>
            <strong className="mt-1 block break-all text-sm">{access.email}</strong>
          </div>
          <AccessStatusActions checkAutomatically={!disabled} />
        </section>
      </div>
    </main>
  );
}
