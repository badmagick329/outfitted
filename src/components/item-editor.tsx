"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalysisStatus } from "@/components/analysis-status-poller";
import {
  categoryGroupOptions,
  inferCategoryGroup,
  type CategoryGroup,
} from "@/features/wardrobe/domain/category-groups";
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
  categoryGroup: CategoryGroup | null;
  primaryColor: string | null;
  secondaryColors: string[];
  material: string | null;
  fit: string | null;
  formality: string | null;
  styleTags: string[];
  seasons: string[];
  analysisStatus: string;
  analysisError: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

type EditableDetails = Pick<
  Item,
  | "name"
  | "description"
  | "category"
  | "categoryGroup"
  | "primaryColor"
  | "secondaryColors"
  | "material"
  | "fit"
  | "formality"
  | "styleTags"
  | "seasons"
>;

type TextDetail = Exclude<
  keyof EditableDetails,
  "categoryGroup" | "secondaryColors" | "styleTags" | "seasons"
>;
type ListDetail = "secondaryColors" | "styleTags" | "seasons";

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-teal focus:ring-2 focus:ring-teal/15";
const labelClassName = "block text-sm font-bold text-ink";

function editableDetails(item: Item): EditableDetails {
  return {
    name: item.name,
    description: item.description,
    category: item.category,
    categoryGroup: item.categoryGroup ?? inferCategoryGroup(item.category),
    primaryColor: item.primaryColor,
    secondaryColors: [...item.secondaryColors],
    material: item.material,
    fit: item.fit,
    formality: item.formality,
    styleTags: [...item.styleTags],
    seasons: [...item.seasons],
  };
}

function detailsMatch(left: EditableDetails, right: EditableDetails) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function commaSeparated(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function messageFrom(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error?.message ?? fallback;
}

export function ItemEditor({
  item,
  canUseAi,
  wardrobeHref = "/wardrobe",
}: {
  item: Item;
  canUseAi: boolean;
  wardrobeHref?: string;
}) {
  const router = useRouter();
  const { trackAnalysis } = useAnalysisStatus();
  const initialDetails = editableDetails(item);
  const [data, setData] = useState(initialDetails);
  const [savedData, setSavedData] = useState(initialDetails);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lastItemVersion = useRef(item.updatedAt);
  const isAnalyzing = item.analysisStatus === "pending" || item.analysisStatus === "processing";
  const hasDetails = Object.values(initialDetails).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  const [detailsOpen, setDetailsOpen] = useState(canUseAi || hasDetails || isAnalyzing);
  const isDirty = !detailsMatch(data, savedData);
  const visibleError =
    error ||
    (item.analysisStatus === "failed"
      ? "We couldn’t read this garment’s details. You can try again."
      : "");

  useEffect(() => {
    if (lastItemVersion.current === item.updatedAt) return;
    const nextDetails = editableDetails(item);
    setData((current) => (detailsMatch(current, savedData) ? nextDetails : current));
    setSavedData(nextDetails);
    lastItemVersion.current = item.updatedAt;
  }, [item, savedData]);

  useEffect(() => {
    if (isAnalyzing) trackAnalysis(item.id);
  }, [isAnalyzing, item.id, trackAnalysis]);

  function setText(key: TextDetail, value: string) {
    setNotice("");
    setData((previous) => ({ ...previous, [key]: value }));
  }

  function setList(key: ListDetail, value: string) {
    setNotice("");
    setData((previous) => ({ ...previous, [key]: commaSeparated(value) }));
  }

  async function save() {
    if (!isDirty) return;
    setSaving(true);
    setError("");
    setNotice("");
    const submitted = {
      ...data,
      categoryGroup: data.categoryGroup ?? inferCategoryGroup(data.category),
    };
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitted),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t save these details."));
        return;
      }
      setSavedData(submitted);
      setNotice("Details saved.");
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
    setNotice("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "POST" });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t start reading this garment."));
        return;
      }
      trackAnalysis(item.id);
      setNotice("Garment analysis started.");
      router.refresh();
    } catch {
      setError("Couldn’t start reading this garment. Check your connection and try again.");
    } finally {
      setRetrying(false);
    }
  }

  async function changeArchive() {
    setArchiving(true);
    setError("");
    setNotice("");
    const restoring = Boolean(item.archivedAt);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: restoring ? null : new Date().toISOString() }),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t update this garment."));
        return;
      }
      router.push(restoring ? wardrobeHref : "/archive");
      router.refresh();
    } catch {
      setError("Couldn’t update this garment. Check your connection and try again.");
    } finally {
      setArchiving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t delete this garment."));
        return;
      }
      router.push(item.archivedAt ? "/archive" : wardrobeHref);
      router.refresh();
    } catch {
      setError("Couldn’t delete this garment. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="self-start rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-mist)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-[-0.04em]">Details</h2>
        <div className="flex items-center gap-2">
          {!canUseAi && !isAnalyzing && (
            <Button variant="ghost" size="sm" onClick={() => setDetailsOpen((open) => !open)}>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={detailsOpen ? "rotate-180 transition" : "transition"}
              />
              {detailsOpen ? "Hide details" : "Add optional details"}
            </Button>
          )}
          {isAnalyzing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide">
              <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />
              {item.analysisStatus === "processing" ? "Reading details" : "Waiting"}
            </span>
          ) : canUseAi ? (
            <Button variant="ghost" size="sm" onClick={retry} disabled={retrying}>
              <RotateCcw size={14} aria-hidden="true" className={retrying ? "animate-spin" : ""} />
              {retrying
                ? "Starting…"
                : item.analysisStatus === "not_requested"
                  ? "Analyse garment"
                  : "Analyse again"}
            </Button>
          ) : null}
        </div>
      </div>

      {visibleError && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {visibleError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-teal/20 bg-mist px-4 py-3 text-sm text-teal-dark"
        >
          {notice}
        </p>
      )}

      {isAnalyzing ? (
        <div className="mt-6 flex gap-4 rounded-2xl bg-mist p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-citrus text-berry">
            <LoaderCircle className="animate-spin" size={21} aria-hidden="true" />
          </span>
          <div>
            <strong>
              {item.analysisStatus === "processing"
                ? "Reading garment details"
                : "Waiting to read the garment"}
            </strong>
            <p className="mt-1 text-sm leading-6 text-ink/65">
              We’re identifying its colour, material, fit, style and seasonality. This page updates
              automatically when it’s ready.
            </p>
          </div>
        </div>
      ) : detailsOpen ? (
        <div className="mt-6 space-y-5">
          <label className={labelClassName}>
            Name
            <input
              className={inputClassName}
              value={data.name}
              onChange={(event) => setText("name", event.target.value)}
            />
          </label>
          <label className={labelClassName}>
            Description
            <textarea
              className={inputClassName}
              value={data.description ?? ""}
              onChange={(event) => setText("description", event.target.value)}
              rows={4}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClassName}>
              Category
              <input
                className={inputClassName}
                value={data.category ?? ""}
                onChange={(event) => setText("category", event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Wardrobe section
              <select
                className={inputClassName}
                value={data.categoryGroup ?? ""}
                onChange={(event) => {
                  setNotice("");
                  setData((previous) => ({
                    ...previous,
                    categoryGroup: (event.target.value || null) as CategoryGroup | null,
                  }));
                }}
              >
                <option value="">Not set</option>
                {categoryGroupOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClassName}>
              Main colour
              <input
                className={inputClassName}
                value={data.primaryColor ?? ""}
                onChange={(event) => setText("primaryColor", event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Other colours
              <input
                className={inputClassName}
                value={data.secondaryColors.join(", ")}
                onChange={(event) => setList("secondaryColors", event.target.value)}
                aria-describedby="secondary-colours-hint"
              />
              <span
                id="secondary-colours-hint"
                className="mt-1 block text-xs font-normal text-ink/50"
              >
                Separate multiple colours with commas.
              </span>
            </label>
            <label className={labelClassName}>
              Material
              <input
                className={inputClassName}
                value={data.material ?? ""}
                onChange={(event) => setText("material", event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Fit
              <input
                className={inputClassName}
                value={data.fit ?? ""}
                onChange={(event) => setText("fit", event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Formality
              <input
                className={inputClassName}
                value={data.formality ?? ""}
                onChange={(event) => setText("formality", event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Style tags
              <input
                className={inputClassName}
                value={data.styleTags.join(", ")}
                onChange={(event) => setList("styleTags", event.target.value)}
                aria-describedby="style-tags-hint"
              />
              <span id="style-tags-hint" className="mt-1 block text-xs font-normal text-ink/50">
                Separate multiple tags with commas.
              </span>
            </label>
            <label className={labelClassName}>
              Seasons
              <input
                className={inputClassName}
                value={data.seasons.join(", ")}
                onChange={(event) => setList("seasons", event.target.value)}
                aria-describedby="seasons-hint"
              />
              <span id="seasons-hint" className="mt-1 block text-xs font-normal text-ink/50">
                Separate multiple seasons with commas.
              </span>
            </label>
          </div>
          <div>
            <Button className="w-full" onClick={save} disabled={saving || !isDirty}>
              {saving && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}
              {saving ? "Saving…" : "Save details"}
            </Button>
            <p className="mt-2 text-center text-xs text-ink/50" aria-live="polite">
              {isDirty ? "You have unsaved changes." : "Your details are up to date."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        <Button variant="ghost" size="sm" onClick={changeArchive} disabled={archiving || deleting}>
          {archiving ? (
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Archive size={15} aria-hidden="true" />
          )}
          {archiving
            ? item.archivedAt
              ? "Restoring…"
              : "Archiving…"
            : item.archivedAt
              ? "Restore garment"
              : "Archive garment"}
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
              disabled={archiving}
              className="text-red-700 hover:bg-red-50 hover:text-red-700"
              onClick={() => setError("")}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete permanently
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {item.name || "this garment"}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the garment record and all of its stored photos. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
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
                  {deleting && (
                    <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                  )}
                  {deleting ? "Deleting…" : "Delete permanently"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
