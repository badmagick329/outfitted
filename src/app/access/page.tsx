import { redirect } from "next/navigation";
import { Clock3, ShieldOff } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentAccess } from "@/features/access/server";

export default async function AccessPage() {
  const access = await getCurrentAccess();
  if (!access) redirect("/login");
  if (access.accessStatus === "active") redirect("/wardrobe");
  const disabled = access.accessStatus === "disabled";
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10 text-ink">
      <section className="w-full max-w-lg rounded-[2rem] border border-line bg-mist p-8 shadow-[9px_9px_0_var(--color-peach)] sm:p-11">
        <span className="inline-flex rounded-2xl bg-berry p-3 text-citrus">
          {disabled ? <ShieldOff size={23} /> : <Clock3 size={23} />}
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-[-0.06em]">
          {disabled ? "Access is paused" : "You’re registered"}
        </h1>
        <p className="mt-4 text-lg leading-7 text-ink/65">
          {disabled
            ? "Your access has been paused. Your wardrobe is safely retained; contact the app administrator if you think this is a mistake."
            : "Thanks for joining. An administrator will review your access before your private wardrobe is available."}
        </p>
        <p className="mt-8 text-sm text-ink/60">Sign in again later to check your status.</p>
        <div className="mt-7">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
