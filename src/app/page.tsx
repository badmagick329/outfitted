import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getCurrentAccess } from "@/features/access/server";
import { getAccessMode } from "@/features/access/settings";

export const metadata: Metadata = {
  title: "Outfitted - Open your wardrobe from anywhere",
  description:
    "Photograph, organise and browse your clothes in a private visual catalogue, with outfit help when you want it.",
};

export default async function Home() {
  const access = await getCurrentAccess();
  if (access) redirect(access.accessStatus === "active" ? "/wardrobe" : "/access");
  return <LandingPage accessMode={await getAccessMode()} />;
}
