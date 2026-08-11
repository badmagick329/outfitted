"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  emptyStyleProfile,
  hasStyleProfileContent,
  type StyleProfile,
} from "@/features/style-profile/domain/contracts";

const fieldClassName =
  "mt-2 min-h-32 w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3 text-sm leading-6 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15";

const fields: Array<{
  key: keyof StyleProfile;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "generalStyle",
    label: "How do you like to dress?",
    description: "Describe the overall look or feeling you tend to prefer.",
    placeholder: "Relaxed and understated, with simple shapes and a little colour…",
  },
  {
    key: "preferences",
    label: "What do you reach for?",
    description: "Mention favourite garments, colours, fits, silhouettes or combinations.",
    placeholder: "Roomy shirts, straight-leg trousers, earthy colours and light layers…",
  },
  {
    key: "avoidances",
    label: "Anything you usually avoid?",
    description: "Add anything that makes an otherwise good suggestion wrong for you.",
    placeholder: "Very slim fits, scratchy materials, loud patterns…",
  },
  {
    key: "occasionNotes",
    label: "How do you dress for recurring occasions?",
    description:
      "Optional notes for work, weekends, evenings or anything else you dress for often.",
    placeholder: "For work I keep things relaxed but polished. At weekends I prioritise comfort…",
  },
];

export function StyleProfileForm({ initialProfile }: { initialProfile: StyleProfile | null }) {
  const initial = initialProfile ?? emptyStyleProfile;
  const [values, setValues] = useState<StyleProfile>(initial);
  const [savedValues, setSavedValues] = useState<StyleProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = fields.some(({ key }) => values[key] !== savedValues[key]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/style-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Couldn’t save your style notes.");
        return;
      }
      const nextValues = (payload?.profile as StyleProfile | null) ?? emptyStyleProfile;
      setValues(nextValues);
      setSavedValues(nextValues);
      setNotice(hasStyleProfileContent(nextValues) ? "Style notes saved." : "Style notes cleared.");
    } catch {
      setError("Couldn’t save your style notes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-9 max-w-4xl space-y-5" onSubmit={save} aria-busy={saving}>
      <div className="rounded-2xl border border-teal/20 bg-mist/60 px-5 py-4 text-sm leading-6 text-ink/65">
        Add as much or as little as you like. These notes only guide AI suggestions and can be
        changed at any time.
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {fields.map((field, index) => (
          <label
            key={field.key}
            className={`rounded-3xl border border-line p-5 sm:p-6 ${
              index % 2 === 0 ? "bg-canvas shadow-[5px_5px_0_var(--color-peach)]" : "bg-mist/55"
            }`}
          >
            <strong className="block text-lg tracking-[-0.025em]">{field.label}</strong>
            <span className="mt-1 block text-sm leading-6 text-ink/60">{field.description}</span>
            <textarea
              className={fieldClassName}
              value={values[field.key]}
              onChange={(event) => {
                setValues((current) => ({ ...current, [field.key]: event.target.value }));
                setError("");
                setNotice("");
              }}
              placeholder={field.placeholder}
              maxLength={2000}
              disabled={saving}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-canvas p-4 sm:px-5">
        <Button type="submit" disabled={!dirty || saving}>
          {saving && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save style notes"}
        </Button>
        <span className="text-sm text-ink/55">Leaving every field blank removes the profile.</span>
        {(error || notice) && (
          <span
            role={error ? "alert" : "status"}
            className={`basis-full rounded-xl px-3 py-2 text-sm ${
              error ? "bg-red-50 text-red-700" : "bg-mist text-teal-dark"
            }`}
          >
            {error || notice}
          </span>
        )}
      </div>
    </form>
  );
}
