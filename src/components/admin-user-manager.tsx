"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccessStatus = "pending" | "active" | "disabled";
type FeatureTier = "inventory" | "ai";

type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  joinedLabel: string;
  accessStatus: AccessStatus;
  featureTier: FeatureTier;
  isAdmin: boolean;
};

type AuditEvent = {
  id: string;
  createdLabel: string;
  previousAccessStatus: string;
  nextAccessStatus: string;
  previousFeatureTier: string;
  nextFeatureTier: string;
  actorName: string | null;
  actorEmail: string;
  targetName: string | null;
  targetEmail: string;
};

const statusStyles: Record<AccessStatus, string> = {
  pending: "border-citrus/80 bg-citrus/35 text-ink",
  active: "border-teal/25 bg-mist text-teal-dark",
  disabled: "border-red-200 bg-red-50 text-red-700",
};

function AccessBadge({ status }: { status: AccessStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function ManagedUserRow({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const [accessStatus, setAccessStatus] = useState(user.accessStatus);
  const [featureTier, setFeatureTier] = useState(user.featureTier);
  const [savedAccessStatus, setSavedAccessStatus] = useState(user.accessStatus);
  const [savedFeatureTier, setSavedFeatureTier] = useState(user.featureTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = accessStatus !== savedAccessStatus || featureTier !== savedFeatureTier;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessStatus, featureTier }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Couldn’t update this account.");
        return;
      }
      setSavedAccessStatus(accessStatus);
      setSavedFeatureTier(featureTier);
      setNotice("Changes saved.");
      router.refresh();
    } catch {
      setError("Couldn’t update this account. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-end sm:px-7 ${accessStatus === "pending" ? "bg-citrus/10" : ""}`}
      onSubmit={save}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="break-words">{user.name ?? "Unnamed member"}</strong>
          <AccessBadge status={accessStatus} />
        </div>
        <span className="block break-all text-sm text-ink/60">{user.email}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-ink/45">
          Joined {user.joinedLabel}
          {user.isAdmin ? " · administrator" : ""}
        </span>
      </div>
      <label className="block text-xs font-bold text-ink/70">
        Access
        <select
          value={accessStatus}
          onChange={(event) => {
            setAccessStatus(event.target.value as AccessStatus);
            setNotice("");
          }}
          className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <label className="block text-xs font-bold text-ink/70">
        Features
        <select
          value={featureTier}
          onChange={(event) => {
            setFeatureTier(event.target.value as FeatureTier);
            setNotice("");
          }}
          className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
        >
          <option value="inventory">Inventory</option>
          <option value="ai">Outfit Desk</option>
        </select>
      </label>
      <Button type="submit" size="sm" disabled={saving || !dirty}>
        {saving && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
        {saving ? "Saving…" : "Save"}
      </Button>
      {(error || notice) && (
        <p
          role={error ? "alert" : "status"}
          className={`rounded-xl px-3 py-2 text-sm sm:col-start-2 sm:col-end-5 ${error ? "bg-red-50 text-red-700" : "border border-teal/15 bg-mist text-teal-dark"}`}
        >
          {error || notice}
        </p>
      )}
    </form>
  );
}

function Change({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  const displayValue = (value: string) => {
    if (label === "Features") return value === "ai" ? "Outfit Desk" : "Wardrobe only";
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs">
      <strong>{label}</strong>
      <span className="text-ink/55">{displayValue(before)}</span>
      <span aria-hidden="true">→</span>
      <span>{displayValue(after)}</span>
    </span>
  );
}

export function AdminUserManager({
  users,
  auditEvents,
}: {
  users: ManagedUser[];
  auditEvents: AuditEvent[];
}) {
  const pendingCount = users.filter((user) => user.accessStatus === "pending").length;
  const activeCount = users.filter((user) => user.accessStatus === "active").length;

  return (
    <div className="mt-9 space-y-10">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Member access summary">
        {[
          { label: "Pending", value: pendingCount, tone: "bg-citrus/35" },
          { label: "Active", value: activeCount, tone: "bg-mist" },
          { label: "Total", value: users.length, tone: "bg-peach/55" },
        ].map((summary) => (
          <div key={summary.label} className={`rounded-2xl border border-line p-4 ${summary.tone}`}>
            <strong className="block text-3xl tracking-[-0.05em]">{summary.value}</strong>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55">
              {summary.label}
            </span>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-canvas shadow-[5px_5px_0_var(--color-mist)]">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">People</h2>
          <p className="mt-1 text-sm text-ink/60">
            Approve access and choose which features each person can use.
          </p>
        </div>
        <div className="divide-y divide-line">
          {users.map((user) => (
            <ManagedUserRow key={user.id} user={user} />
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
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <strong>{event.targetName ?? event.targetEmail}</strong>
                  <span className="text-ink/55">
                    updated by {event.actorName ?? event.actorEmail}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Change
                    label="Access"
                    before={event.previousAccessStatus}
                    after={event.nextAccessStatus}
                  />
                  <Change
                    label="Features"
                    before={event.previousFeatureTier}
                    after={event.nextFeatureTier}
                  />
                </div>
                <span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-ink/45">
                  {event.createdLabel}
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
