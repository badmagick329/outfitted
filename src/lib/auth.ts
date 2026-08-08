import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: DrizzleAdapter(db),
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  callbacks: { session: ({ session, user }) => { if (session.user) session.user.id = user.id; return session; } },
};
export const auth = () => getServerSession(authOptions);
export async function requireUserId() { const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized"); return session.user.id; }
