import { AdminUserManager } from "@/components/admin-user-manager";
import { AdminSectionNavigation } from "@/components/admin-section-navigation";
import { MemberPageHeader } from "@/components/member-page-header";
import {
  listAccessAuditEvents,
  listManagedUsers,
  requireAdminUser,
} from "@/features/access/server";

export default async function AdminUsersPage() {
  await requireAdminUser();
  const [users, auditEvents] = await Promise.all([listManagedUsers(), listAccessAuditEvents()]);
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
  const sortedUsers = [...users].sort(
    (left, right) =>
      statusOrder[left.accessStatus] - statusOrder[right.accessStatus] ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );

  return (
    <>
      <MemberPageHeader
        title="Member access"
        description={<p>Manage access and available features.</p>}
        tone="peach"
      />
      <AdminSectionNavigation active="users" />
      <AdminUserManager
        users={sortedUsers.map(({ createdAt, ...user }) => ({
          ...user,
          joinedLabel: dateFormatter.format(createdAt),
        }))}
        auditEvents={auditEvents.map(({ createdAt, ...event }) => ({
          ...event,
          createdLabel: dateTimeFormatter.format(createdAt),
        }))}
      />
    </>
  );
}
