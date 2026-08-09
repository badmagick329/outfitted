import { getCurrentAccess } from "@/features/access/server";
import { redirect } from "next/navigation";
export default async function Home() {
  const access = await getCurrentAccess();
  redirect(!access ? "/login" : access.accessStatus === "active" ? "/wardrobe" : "/access");
}
