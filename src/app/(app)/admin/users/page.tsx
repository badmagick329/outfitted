import { AdminUserManager } from "@/components/admin-user-manager";
import { AdminSectionNavigation } from "@/components/admin-section-navigation";
import { MemberPageHeader } from "@/components/member-page-header";
import {
  listAccessAuditEvents,
  listManagedUsers,
  requireAdminUser,
} from "@/features/access/server";
import { getAccessMode } from "@/features/access/settings";
import { aiAccessService } from "@/features/ai-access/server";
import { listFeatureGrantsForUsers } from "@/features/feature-grants/server";
import {
  getAiBudgets,
  getDefaultAiBudget,
  listAiBudgetAuditEvents,
} from "@/features/ai-budget/server";
import {
  directoryQuerySchema,
  queryMemberDirectory,
} from "@/features/access/application/member-directory";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const raw = await searchParams;
  const parsed = directoryQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : directoryQuerySchema.parse({});
  const [users, auditEvents, accessMode, pendingAiRequests, defaultLimit, budgetAuditEvents] =
    await Promise.all([
      listManagedUsers(),
      listAccessAuditEvents(),
      getAccessMode(),
      aiAccessService.listPending(),
      getDefaultAiBudget(),
      listAiBudgetAuditEvents(),
    ]);
  const budgets = await getAiBudgets(users.map((user) => user.id));
  const budgetsByUser = new Map(budgets.map((budget) => [budget.userId, budget]));
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
  const requestedUserIds = new Set(pendingAiRequests.map((request) => request.userId));
  const directory = queryMemberDirectory(
    users.map((user) => {
      const budget = budgetsByUser.get(user.id);
      if (!budget) throw new Error("Budget snapshot missing for member");
      return { ...user, budget, hasPendingAiRequest: requestedUserIds.has(user.id) };
    }),
    query,
  );
  const featureGrants = await listFeatureGrantsForUsers(directory.rows.map((user) => user.id));
  const memberLabels = new Map(users.map((user) => [user.id, user.name ?? user.email]));

  return (
    <>
      <MemberPageHeader
        title="Member access"
        description={<p>Manage access and available features.</p>}
        tone="peach"
      />
      <AdminSectionNavigation active="users" />
      <AdminUserManager
        budgetAuditEvents={budgetAuditEvents.map((event) => ({
          ...event,
          createdLabel: dateTimeFormatter.format(event.createdAt),
          actorLabel: memberLabels.get(event.actorUserId) ?? event.actorUserId,
          targetLabel: event.targetUserId
            ? (memberLabels.get(event.targetUserId) ?? event.targetUserId)
            : "Shared default",
        }))}
        defaultLimit={defaultLimit}
        directory={{
          query: { ...query, page: directory.page },
          total: directory.total,
          pageCount: directory.pageCount,
          matchedIds: directory.matchedIds,
        }}
        summary={{
          total: users.length,
          pending: users.filter((user) => user.accessStatus === "pending").length,
          active: users.filter((user) => user.effectiveAccessStatus === "active").length,
          admittedByPublicMode: users.filter(
            (user) => user.accessStatus === "pending" && user.effectiveAccessStatus === "active",
          ).length,
        }}
        accessMode={accessMode}
        users={directory.rows.map(({ createdAt, ...user }) => ({
          ...user,
          joinedLabel: dateFormatter.format(createdAt),
          hasPendingAiRequest: requestedUserIds.has(user.id),
          featureGrants: featureGrants[user.id] ?? [],
        }))}
        aiRequests={pendingAiRequests.map((request) => ({
          id: request.id,
          name: request.userName,
          email: request.userEmail,
          requestedLabel: dateTimeFormatter.format(request.createdAt),
        }))}
        auditEvents={auditEvents.map(({ createdAt, ...event }) => ({
          ...event,
          createdLabel: dateTimeFormatter.format(createdAt),
        }))}
      />
    </>
  );
}
