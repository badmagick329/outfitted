import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getCurrentAccess } from "@/features/access/server";
import { getAccessMode } from "@/features/access/settings";

export const metadata: Metadata = {
  title: "Outfitted - Check what you own before you buy",
  description:
    "Keep a photo catalogue of your clothes on your phone. In a shop, filter it to see what you already own and what's missing.",
};

export default async function Home() {
  const access = await getCurrentAccess();
  if (access) redirect(access.accessStatus === "active" ? "/wardrobe" : "/access");
  return <LandingPage accessMode={await getAccessMode()} />;
}
