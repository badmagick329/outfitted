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

export default async function AdminUsersPage() {
  await requireAdminUser();
  const [users, auditEvents, accessMode, pendingAiRequests] = await Promise.all([
    listManagedUsers(),
    listAccessAuditEvents(),
    getAccessMode(),
    aiAccessService.listPending(),
  ]);
  const featureGrants = await listFeatureGrantsForUsers(users.map((user) => user.id));
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
  const statusOrder = { pending: 0, active: 1, disabled: 2 } as const;
  const requestedUserIds = new Set(pendingAiRequests.map((request) => request.userId));
  const sortedUsers = [...users].sort((left, right) => {
    const leftRequested = requestedUserIds.has(left.id) ? 0 : 1;
    const rightRequested = requestedUserIds.has(right.id) ? 0 : 1;
    return (
      leftRequested - rightRequested ||
      statusOrder[left.accessStatus] - statusOrder[right.accessStatus] ||
      left.createdAt.getTime() - right.createdAt.getTime()
    );
  });

  return (
    <>
      <MemberPageHeader
        title="Member access"
        description={<p>Manage access and available features.</p>}
        tone="peach"
      />
      <AdminSectionNavigation active="users" />
      <AdminUserManager
        accessMode={accessMode}
        users={sortedUsers.map(({ createdAt, ...user }) => ({
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
