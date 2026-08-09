import type { AccessStatus, FeatureTier } from "./contracts";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function asAccessStatus(value: string): AccessStatus {
  return value === "active" || value === "disabled" ? value : "pending";
}

export function asFeatureTier(value: string): FeatureTier {
  return value === "ai" ? "ai" : "inventory";
}

export function resolveAccountAccess(
  user: { accessStatus: string; featureTier: string; email: string },
  adminEmailSet: ReadonlySet<string>,
) {
  const isAdmin = adminEmailSet.has(normalizeEmail(user.email));
  const accessStatus: AccessStatus = isAdmin ? "active" : asAccessStatus(user.accessStatus);
  const featureTier: FeatureTier = isAdmin ? "ai" : asFeatureTier(user.featureTier);
  return { accessStatus, featureTier, isAdmin, canUseAi: featureTier === "ai" };
}
