import { z } from "zod";

export const directoryQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  access: z.enum(["all", "pending", "active", "disabled"]).default("all"),
  ai: z.enum(["all", "ai", "inventory", "requested"]).default("all"),
  budget: z.enum(["all", "available", "reserved", "exhausted", "override"]).default("all"),
  sort: z.enum(["name", "joined", "spend", "remaining"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
});
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

export type DirectoryEntry = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  effectiveAccessStatus: string;
  featureTier: string;
  isAdmin: boolean;
  hasPendingAiRequest: boolean;
  budget: {
    spentMicrousd: number;
    reservedMicrousd: number;
    availableMicrousd: number;
    limitMicrousd: number;
    overrideLimitMicrousd: number | null;
  };
};

export const MEMBER_PAGE_SIZE = 25;

export function memberBudgetState(budget: DirectoryEntry["budget"]) {
  if (budget.spentMicrousd >= budget.limitMicrousd) return "exhausted";
  if (budget.reservedMicrousd > 0) return "reserved";
  return "available";
}

export function queryMemberDirectory<T extends DirectoryEntry>(
  members: T[],
  query: DirectoryQuery,
) {
  const search = query.q.toLocaleLowerCase("en-GB");
  const filtered = members.filter((member) => {
    const ai = member.isAdmin ? "ai" : member.featureTier;
    return (
      (!search ||
        `${member.name ?? ""} ${member.email}`.toLocaleLowerCase("en-GB").includes(search)) &&
      (query.access === "all" || member.effectiveAccessStatus === query.access) &&
      (query.ai === "all" ||
        (query.ai === "requested" ? member.hasPendingAiRequest : ai === query.ai)) &&
      (query.budget === "all" ||
        (query.budget === "override"
          ? member.budget.overrideLimitMicrousd !== null
          : memberBudgetState(member.budget) === query.budget))
    );
  });
  const direction = query.direction === "asc" ? 1 : -1;
  filtered.sort((left, right) => {
    const value =
      query.sort === "joined"
        ? left.createdAt.getTime() - right.createdAt.getTime()
        : query.sort === "spend"
          ? left.budget.spentMicrousd - right.budget.spentMicrousd
          : query.sort === "remaining"
            ? left.budget.availableMicrousd - right.budget.availableMicrousd
            : (left.name ?? left.email).localeCompare(right.name ?? right.email, "en-GB");
    return direction * value || left.id.localeCompare(right.id);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / MEMBER_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  return {
    rows: filtered.slice((page - 1) * MEMBER_PAGE_SIZE, page * MEMBER_PAGE_SIZE),
    matchedIds: filtered.map((member) => member.id),
    total: filtered.length,
    page,
    pageCount,
  };
}

export function directoryHref(query: DirectoryQuery, page = query.page) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) params.set(key, String(value));
  return `/admin/users?${params}`;
}
