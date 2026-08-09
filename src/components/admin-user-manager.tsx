"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  accessStatus: "pending" | "active" | "disabled";
  featureTier: "inventory" | "ai";
  isAdmin: boolean;
};
type AuditEvent = {
  id: string;
  createdAt: string;
  previousAccessStatus: string;
  nextAccessStatus: string;
  previousFeatureTier: string;
  nextFeatureTier: string;
  actorName: string | null;
  actorEmail: string;
  targetName: string | null;
  targetEmail: string;
};

export function AdminUserManager({
  users,
  auditEvents,
}: {
  users: ManagedUser[];
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save(user: ManagedUser, form: HTMLFormElement) {
    setSaving(user.id);
    setError("");
    const data = new FormData(form);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessStatus: data.get("accessStatus"),
          featureTier: data.get("featureTier"),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Couldn’t update this account.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn’t update this account. Check your connection and try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-9 space-y-10">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-3xl border border-line bg-canvas shadow-[5px_5px_0_var(--color-mist)]">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">People</h2>
          <p className="mt-1 text-sm text-ink/60">
            Approve access and choose which features each person can use.
          </p>
        </div>
        <div className="divide-y divide-line">
          {users.map((user) => (
            <form
              key={user.id}
              className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-end sm:px-7"
              onSubmit={(event) => {
                event.preventDefault();
                void save(user, event.currentTarget);
              }}
            >
              <div className="min-w-0">
                <strong className="block break-words">{user.name ?? "Unnamed member"}</strong>
                <span className="block break-all text-sm text-ink/60">{user.email}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-ink/45">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                  {user.isAdmin ? " · administrator" : ""}
                </span>
              </div>
              <label className="block text-xs font-bold text-ink/70">
                Access
                <select
                  name="accessStatus"
                  defaultValue={user.accessStatus}
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-ink/70">
                Features
                <select
                  name="featureTier"
                  defaultValue={user.featureTier}
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="inventory">Inventory</option>
                  <option value="ai">AI</option>
                </select>
              </label>
              <Button type="submit" size="sm" disabled={saving === user.id}>
                {saving === user.id && <LoaderCircle className="animate-spin" size={14} />}
                Save
              </Button>
            </form>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-line bg-mist/60">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">Permission history</h2>
        </div>
        {auditEvents.length ? (
          <ul className="divide-y divide-line">
            {auditEvents.map((event) => (
              <li key={event.id} className="px-5 py-4 text-sm sm:px-7">
                <strong>{event.actorName ?? event.actorEmail}</strong> updated{" "}
                <strong>{event.targetName ?? event.targetEmail}</strong>
                <span className="text-ink/60">
                  {" "}
                  · {event.previousAccessStatus} / {event.previousFeatureTier} →{" "}
                  {event.nextAccessStatus} / {event.nextFeatureTier}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-ink/45">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-7 text-sm text-ink/60 sm:px-7">
            No permission changes have been made yet.
          </p>
        )}
      </section>
    </div>
  );
}
