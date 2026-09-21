"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { AccessModeControl } from "@/components/access-mode-control";
import { Button } from "@/components/ui/button";
import type { AccessMode } from "@/features/access/contracts";

type AccessStatus = "pending" | "active" | "disabled";
type FeatureTier = "inventory" | "ai";

type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  joinedLabel: string;
  accessStatus: AccessStatus;
  effectiveAccessStatus: AccessStatus;
  featureTier: FeatureTier;
  isAdmin: boolean;
  hasPendingAiRequest: boolean;
  featureGrants: Array<{
    key: string;
    label: string;
    description: string;
    remainingUses: number;
    available: boolean;
  }>;
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

type AiAccessRequestItem = {
  id: string;
  name: string | null;
  email: string;
  requestedLabel: string;
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

function ManagedUserRow({ user, accessMode }: { user: ManagedUser; accessMode: AccessMode }) {
  const router = useRouter();
  const [accessStatus, setAccessStatus] = useState(user.accessStatus);
  const [featureTier, setFeatureTier] = useState(user.featureTier);
  const [savedAccessStatus, setSavedAccessStatus] = useState(user.accessStatus);
  const [savedFeatureTier, setSavedFeatureTier] = useState(user.featureTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [featureNotice, setFeatureNotice] = useState("");
  const [featureError, setFeatureError] = useState("");
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);
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

  async function updateFeature(featureKey: string, action: "grant" | "revoke") {
    if (featureSaving) return;
    setFeatureSaving(featureKey);
    setFeatureNotice("");
    setFeatureError("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}/feature-grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, action }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeatureError(payload?.error?.message ?? "Couldn’t update this alpha feature.");
        return;
      }
      setFeatureNotice(action === "grant" ? "One use granted." : "Grant revoked.");
      router.refresh();
    } catch {
      setFeatureError("Couldn’t update this alpha feature. Check your connection and try again.");
    } finally {
      setFeatureSaving(null);
    }
  }

  return (
    <form
      className={`p-5 sm:px-7 ${
        accessStatus === "pending" ? (accessMode === "public" ? "bg-mist/40" : "bg-citrus/10") : ""
      }`}
      onSubmit={save}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-end">
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
          {accessMode === "public" && accessStatus === "pending" && (
            <span className="mt-2 inline-flex rounded-full border border-teal/25 bg-mist px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-teal-dark">
              Can enter now · public mode
            </span>
          )}
          {user.hasPendingAiRequest && (
            <span className="mt-2 inline-flex rounded-full border border-citrus/80 bg-citrus/35 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-ink">
              AI access requested
            </span>
          )}
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
      </div>
      {(error || notice) && (
        <p
          role={error ? "alert" : "status"}
          className={`rounded-xl px-3 py-2 text-sm sm:col-start-2 sm:col-end-5 ${error ? "bg-red-50 text-red-700" : "border border-teal/15 bg-mist text-teal-dark"}`}
        >
          {error || notice}
        </p>
      )}
      <section
        className="mt-5 border-t border-line pt-4"
        aria-label={`Alpha features for ${user.name ?? user.email}`}
      >
        <h3 className="text-sm font-bold">Alpha features</h3>
        <div className="mt-3 space-y-3">
          {user.featureGrants.map((feature) => {
            const effectiveAccessStatus: AccessStatus =
              accessMode === "public" && savedAccessStatus === "pending"
                ? "active"
                : savedAccessStatus;
            const eligible = effectiveAccessStatus === "active" && savedFeatureTier === "ai";
            const savingFeature = featureSaving === feature.key;
            return (
              <div
                key={feature.key}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-canvas/65 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <strong className="block text-sm">{feature.label}</strong>
                  <span className="mt-0.5 block text-xs text-ink/60">{feature.description}</span>
                  <span className="mt-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-ink/50">
                    {user.isAdmin
                      ? "Always available to administrators"
                      : feature.available
                        ? "Available once"
                        : "Unavailable"}
                  </span>
                </div>
                {!user.isAdmin &&
                  (feature.available ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={savingFeature}
                      onClick={() => updateFeature(feature.key, "revoke")}
                    >
                      {savingFeature ? "Updating…" : "Revoke"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={savingFeature || !eligible}
                      title={eligible ? undefined : "Requires an active account with AI access."}
                      onClick={() => updateFeature(feature.key, "grant")}
                    >
                      {savingFeature ? "Granting…" : "Grant one use"}
                    </Button>
                  ))}
              </div>
            );
          })}
        </div>
        {(featureError || featureNotice) && (
          <p
            role={featureError ? "alert" : "status"}
            className={`mt-3 rounded-xl px-3 py-2 text-sm ${featureError ? "bg-red-50 text-red-700" : "border border-teal/15 bg-mist text-teal-dark"}`}
          >
            {featureError || featureNotice}
          </p>
        )}
      </section>
    </form>
  );
}

function PendingAiRequestRow({ request }: { request: AiAccessRequestItem }) {
  const router = useRouter();
  const [resolving, setResolving] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function decide(decision: "approved" | "declined") {
    if (resolving) return;
    setResolving(decision);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/ai-access-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Couldn’t update this request.");
        return;
      }
      setNotice(decision === "approved" ? "AI access granted." : "Request declined.");
      router.refresh();
    } catch {
      setError("Couldn’t update this request. Check your connection and try again.");
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="break-words">{request.name ?? "Unnamed member"}</strong>
          <span className="inline-flex rounded-full border border-citrus/80 bg-citrus/35 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-ink">
            Pending
          </span>
        </div>
        <span className="block break-all text-sm text-ink/60">{request.email}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-ink/45">
          Requested {request.requestedLabel}
        </span>
        {(error || notice) && (
          <p
            role={error ? "alert" : "status"}
            className={`mt-2 rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "border border-teal/15 bg-mist text-teal-dark"}`}
          >
            {error || notice}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={resolving !== null}
          onClick={() => decide("approved")}
        >
          {resolving === "approved" ? "Approving…" : "Approve AI"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={resolving !== null}
          onClick={() => decide("declined")}
        >
          {resolving === "declined" ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
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
  accessMode,
  users,
  aiRequests,
  auditEvents,
}: {
  accessMode: AccessMode;
  users: ManagedUser[];
  aiRequests: AiAccessRequestItem[];
  auditEvents: AuditEvent[];
}) {
  const pendingCount = users.filter((user) => user.accessStatus === "pending").length;
  const activeCount = users.filter((user) => user.effectiveAccessStatus === "active").length;
  const admittedByPublicMode = users.filter(
    (user) => user.accessStatus === "pending" && user.effectiveAccessStatus === "active",
  ).length;

  const summaries =
    accessMode === "public"
      ? [
          {
            label: "Can enter now",
            value: activeCount,
            tone: "bg-mist",
            hint:
              admittedByPublicMode > 0
                ? `${admittedByPublicMode} admitted by public mode`
                : undefined,
          },
          {
            label: "Still pending",
            value: pendingCount,
            tone: "bg-citrus/35",
            hint: "Entering while public · gated again if switched to private",
          },
          { label: "Total", value: users.length, tone: "bg-peach/55", hint: undefined },
        ]
      : [
          { label: "Pending", value: pendingCount, tone: "bg-citrus/35", hint: undefined },
          { label: "Active", value: activeCount, tone: "bg-mist", hint: undefined },
          { label: "Total", value: users.length, tone: "bg-peach/55", hint: undefined },
        ];

  return (
    <div className="mt-9 space-y-10">
      <AccessModeControl accessMode={accessMode} />

      <section
        className="overflow-hidden rounded-3xl border border-line bg-citrus/10 shadow-[5px_5px_0_var(--color-citrus)]"
        aria-label="AI access requests"
      >
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">AI access requests</h2>
          <p className="mt-1 text-sm text-ink/60">
            {aiRequests.length
              ? "Approve to switch the member to AI features, or decline to keep them on inventory."
              : "No members are waiting for AI access."}
          </p>
        </div>
        {aiRequests.length > 0 && (
          <div className="divide-y divide-line">
            {aiRequests.map((request) => (
              <PendingAiRequestRow key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Member access summary">
        {summaries.map((summary) => (
          <div key={summary.label} className={`rounded-2xl border border-line p-4 ${summary.tone}`}>
            <strong className="block text-3xl tracking-[-0.05em]">{summary.value}</strong>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55">
              {summary.label}
            </span>
            {summary.hint && (
              <span className="mt-1 block text-[11px] leading-4 text-ink/55">{summary.hint}</span>
            )}
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-canvas shadow-[5px_5px_0_var(--color-mist)]">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">People</h2>
          <p className="mt-1 text-sm text-ink/60">
            {accessMode === "public"
              ? "New accounts can already enter. Their stored status still applies if you switch back to private."
              : "Approve access and choose which features each person can use."}
          </p>
        </div>
        <div className="divide-y divide-line">
          {users.map((user) => (
            <ManagedUserRow
              key={`${user.id}:${user.accessStatus}:${user.featureTier}`}
              user={user}
              accessMode={accessMode}
            />
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
