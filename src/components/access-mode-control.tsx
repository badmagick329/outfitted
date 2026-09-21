"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccessMode } from "@/features/access/contracts";

const options: Array<{
  value: AccessMode;
  label: string;
  summary: string;
  detail: string;
  icon: typeof Globe;
}> = [
  {
    value: "private",
    label: "Private",
    summary: "New accounts wait for approval.",
    detail:
      "Pending members stay locked out until you approve them. This is the default and keeps every account gated.",
    icon: LockKeyhole,
  },
  {
    value: "public",
    label: "Public",
    summary: "New accounts enter immediately.",
    detail:
      "Pending members can enter right away without being approved. AI features stay off until you grant them, and disabled accounts remain blocked.",
    icon: Globe,
  },
];

export function AccessModeControl({ accessMode }: { accessMode: AccessMode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AccessMode>(accessMode);
  const [saved, setSaved] = useState<AccessMode>(accessMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = draft !== saved;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/settings/access-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessMode: draft }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Couldn’t update the access mode.");
        return;
      }
      setSaved(draft);
      setNotice(draft === "public" ? "Public mode is on." : "Private mode is on.");
      router.refresh();
    } catch {
      setError("Couldn’t update the access mode. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-3xl border-2 border-ink bg-canvas p-5 shadow-[6px_6px_0_var(--color-citrus)] sm:p-7"
      aria-label="Access mode"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-berry">
            Access mode
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">
            Currently {saved === "public" ? "public" : "private"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/60">
            Switch how new sign-ups are handled. This is reversible and never rewrites stored
            approval decisions.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide ${
            saved === "public"
              ? "border-teal/25 bg-mist text-teal-dark"
              : "border-citrus/80 bg-citrus/35 text-ink"
          }`}
        >
          {saved === "public" ? <Globe size={12} /> : <LockKeyhole size={12} />}
          {saved === "public" ? "Open sign-ups" : "Approval required"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = draft === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setDraft(option.value);
                setNotice("");
              }}
              className={`rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
                selected ? "border-teal bg-mist/70" : "border-line bg-canvas hover:border-teal/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={16} aria-hidden="true" />
                <strong className="text-sm">{option.label}</strong>
              </span>
              <span className="mt-2 block text-sm font-semibold">{option.summary}</span>
              <span className="mt-1 block text-xs leading-5 text-ink/60">{option.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={saving || !dirty} onClick={save}>
          {saving && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
          {saving ? "Saving…" : "Save access mode"}
        </Button>
        {dirty && <span className="text-xs font-semibold text-ink/55">Unsaved change</span>}
      </div>

      {(error || notice) && (
        <p
          role={error ? "alert" : "status"}
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "border border-teal/15 bg-mist text-teal-dark"}`}
        >
          {error || notice}
        </p>
      )}
    </section>
  );
}
