import type { AccessMode, AccessStatus, FeatureTier } from "./contracts";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function asAccessStatus(value: string): AccessStatus {
  return value === "active" || value === "disabled" ? value : "pending";
}

export function asFeatureTier(value: string): FeatureTier {
  return value === "ai" ? "ai" : "inventory";
}

export function asAccessMode(value: string | null | undefined): AccessMode {
  return value === "public" ? "public" : "private";
}

export function resolveEffectiveAccessStatus(
  storedStatus: AccessStatus,
  accessMode: AccessMode,
): AccessStatus {
  if (accessMode === "public" && storedStatus === "pending") return "active";
  return storedStatus;
}

export function resolveAccountAccess(
  user: { accessStatus: string; featureTier: string; email: string },
  adminEmailSet: ReadonlySet<string>,
  accessMode: AccessMode,
) {
  const isAdmin = adminEmailSet.has(normalizeEmail(user.email));
  const accessStatus: AccessStatus = isAdmin
    ? "active"
    : resolveEffectiveAccessStatus(asAccessStatus(user.accessStatus), accessMode);
  const featureTier: FeatureTier = isAdmin ? "ai" : asFeatureTier(user.featureTier);
  return { accessStatus, featureTier, isAdmin, canUseAi: featureTier === "ai" };
}
