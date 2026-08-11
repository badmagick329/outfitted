import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userStyleProfiles } from "@/lib/db/schema";
import {
  emptyStyleProfile,
  hasStyleProfileContent,
  type StyleProfile,
  type StyleProfileInput,
} from "./domain/contracts";

const profileSelection = {
  generalStyle: userStyleProfiles.generalStyle,
  preferences: userStyleProfiles.preferences,
  avoidances: userStyleProfiles.avoidances,
  occasionNotes: userStyleProfiles.occasionNotes,
};

export async function getStyleProfile(userId: string): Promise<StyleProfile | null> {
  const [profile] = await db
    .select(profileSelection)
    .from(userStyleProfiles)
    .where(eq(userStyleProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function saveStyleProfile(userId: string, input: StyleProfileInput) {
  if (!hasStyleProfileContent(input)) {
    await db.delete(userStyleProfiles).where(eq(userStyleProfiles.userId, userId));
    return null;
  }

  const [profile] = await db
    .insert(userStyleProfiles)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: userStyleProfiles.userId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning(profileSelection);
  return profile ?? emptyStyleProfile;
}

export const styleProfileReader = { find: getStyleProfile };
