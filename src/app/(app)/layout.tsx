import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, CircleUserRound, Shirt, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); if (!session?.user) redirect("/login");
  return <div className="app-shell"><aside className="sidebar"><Link href="/wardrobe" className="wordmark"><span className="brand-mark"><Sparkles size={16} /></span> outfitted</Link><nav><Link href="/wardrobe"><Shirt size={17} /> Wardrobe</Link><Link href="/outfits"><Sparkles size={17} /> Outfit desk</Link><Link href="/archive"><Archive size={17} /> Archive</Link></nav><div className="sidebar-user"><CircleUserRound size={19} /><div><strong>{session.user.name ?? "Your wardrobe"}</strong><SignOutButton /></div></div></aside><section className="main-content">{children}</section></div>;
}
