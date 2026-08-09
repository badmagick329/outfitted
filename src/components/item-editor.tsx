"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  primaryColor: string | null;
  material: string | null;
  fit: string | null;
  formality: string | null;
  styleTags: string[];
  seasons: string[];
  analysisStatus: string;
  analysisError: string | null;
  archivedAt: Date | null;
};

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-teal focus:ring-2 focus:ring-teal/15";
const labelClassName = "block text-sm font-bold text-ink";

async function messageFrom(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error?.message ?? fallback;
}

export function ItemEditor({ item }: { item: Item }) {
  const router = useRouter();
  const [data, setData] = useState(item);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const isAnalyzing = item.analysisStatus === "pending" || item.analysisStatus === "processing";
  const set = (key: keyof Item, value: string) =>
    setData((previous) => ({ ...previous, [key]: value }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          primaryColor: data.primaryColor,
          material: data.material,
          fit: data.fit,
          formality: data.formality,
          styleTags: data.styleTags,
          seasons: data.seasons,
        }),
      });
      if (!response.ok)
        return setError(await messageFrom(response, "Couldn’t save these details."));
      router.refresh();
    } catch {
      setError("Couldn’t save these details. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function retry() {
    setRetrying(true);
    setError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "POST" });
      if (!response.ok)
        return setError(await messageFrom(response, "Couldn’t queue a new analysis."));
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  async function changeArchive(archivedAt: string | null) {
    const response = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt }),
    });
    if (!response.ok) return setError(await messageFrom(response, "Couldn’t update this garment."));
    router.push("/wardrobe");
    router.refresh();
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!response.ok)
        return setError(await messageFrom(response, "Couldn’t delete this garment."));
      router.push("/wardrobe");
      router.refresh();
    } catch {
      setError("Couldn’t delete this garment. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-mist)] sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-[-0.04em]">Details</h2>
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide">
            <LoaderCircle className="animate-spin" size={14} />
            {item.analysisStatus === "processing" ? "Analyzing" : "Queued"}
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={retry} disabled={retrying}>
            <RotateCcw size={14} className={retrying ? "animate-spin" : ""} />
            {retrying ? "Queuing…" : "Re-analyze"}
          </Button>
        )}
      </div>

      {isAnalyzing ? (
        <div className="mt-6 flex gap-4 rounded-2xl bg-mist p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-citrus text-berry">
            <LoaderCircle className="animate-spin" size={21} />
          </span>
          <div>
            <strong>
              {item.analysisStatus === "processing"
                ? "Reading garment details"
                : "Analysis is queued"}
            </strong>
            <p className="mt-1 text-sm leading-6 text-ink/65">
              We’re identifying its colour, material, fit, style and seasonality. This page updates
              automatically when it’s ready.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {(error || data.analysisStatus === "failed") && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || "We couldn’t analyze this garment. Try again in a moment."}
            </p>
          )}
          <label className={labelClassName}>
            Name
            <input
              className={inputClassName}
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label className={labelClassName}>
            Description
            <textarea
              className={inputClassName}
              value={data.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClassName}>
              Category
              <input
                className={inputClassName}
                value={data.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Main colour
              <input
                className={inputClassName}
                value={data.primaryColor ?? ""}
                onChange={(e) => set("primaryColor", e.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Material
              <input
                className={inputClassName}
                value={data.material ?? ""}
                onChange={(e) => set("material", e.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Fit
              <input
                className={inputClassName}
                value={data.fit ?? ""}
                onChange={(e) => set("fit", e.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Formality
              <input
                className={inputClassName}
                value={data.formality ?? ""}
                onChange={(e) => set("formality", e.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Style tags
              <input
                className={inputClassName}
                value={data.styleTags.join(", ")}
                onChange={(e) =>
                  setData((previous) => ({
                    ...previous,
                    styleTags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" size={17} />}
            {saving ? "Saving…" : "Save details"}
          </Button>
          <div className="flex flex-wrap gap-2 border-t border-line pt-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeArchive(item.archivedAt ? null : new Date().toISOString())}
            >
              <Archive size={15} /> {item.archivedAt ? "Restore garment" : "Archive garment"}
            </Button>
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                if (!deleting) setDeleteOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setError("")}
                >
                  <Trash2 size={15} /> Delete permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the garment record and all of its stored photos. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error && (
                  <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="outline" disabled={deleting}>
                      Cancel
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void remove();
                      }}
                    >
                      {deleting && <LoaderCircle className="animate-spin" size={16} />}
                      {deleting ? "Deleting…" : "Delete permanently"}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </section>
  );
}
