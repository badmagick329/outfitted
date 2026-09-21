import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import type { AccessMode } from "./contracts";
import { asAccessMode } from "./policy";

const SETTINGS_ID = "singleton";

/**
 * Reads the deployment-wide access mode. The settings row is intentionally optional:
 * a freshly migrated database has none, and an absent row must stay fail-closed (private)
 * so deploying the migration never exposes pending accounts by accident.
 */
export async function getAccessMode(): Promise<AccessMode> {
  const [row] = await db
    .select({ accessMode: appSettings.accessMode })
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID))
    .limit(1);
  return asAccessMode(row?.accessMode);
}

export async function setAccessMode(accessMode: AccessMode) {
  await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID, accessMode, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { accessMode, updatedAt: new Date() },
    });
}
