import { connection } from "next/server";
import { LoginView } from "@/components/login-view";
import { getAccessMode } from "@/features/access/settings";

export default async function LoginPage() {
  await connection();
  return <LoginView accessMode={await getAccessMode()} />;
}
