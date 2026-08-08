import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Home() { redirect((await auth())?.user ? "/wardrobe" : "/login"); }
