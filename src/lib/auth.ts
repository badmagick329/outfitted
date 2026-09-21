import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { after } from "next/server";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { notificationService } from "@/features/notifications/server";
import { unauthorized } from "@/shared/application-error";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    // Fires only when the adapter creates a user, so repeat sign-ins never notify. The
    // enqueue is registered as post-response work and is best-effort, so it can never delay
    // the OAuth callback or break authentication.
    createUser: ({ user }) => {
      after(async () => {
        try {
          await notificationService.enqueue("account_created", user.id);
        } catch (error) {
          console.error("Couldn’t enqueue the account-created notification", error);
        }
      });
    },
  },
};
export const auth = () => getServerSession(authOptions);
export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  return session.user.id;
}
