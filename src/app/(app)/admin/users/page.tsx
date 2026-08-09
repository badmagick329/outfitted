import { AdminUserManager } from "@/components/admin-user-manager";
import {
  listAccessAuditEvents,
  listManagedUsers,
  requireAdminUser,
} from "@/features/access/server";

export default async function AdminUsersPage() {
  await requireAdminUser();
  const [users, auditEvents] = await Promise.all([listManagedUsers(), listAccessAuditEvents()]);
  return (
    <>
      <header className="rounded-3xl border border-line bg-peach/65 p-6 shadow-[5px_5px_0_var(--color-citrus)] sm:p-8">
        <h1 className="text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Member access</h1>
        <p className="mt-3 max-w-2xl text-ink/65">Manage access and available features.</p>
      </header>
      <AdminUserManager
        users={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))}
        auditEvents={auditEvents.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
