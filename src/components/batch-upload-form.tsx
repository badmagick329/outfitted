/* eslint-disable @next/next/no-img-element -- local object URLs are required for pre-upload previews. */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleAlert,
  FileImage,
  Images,
  LoaderCircle,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { useAnalysisStatus } from "@/components/analysis-status-poller";
import { Button } from "@/components/ui/button";
import { useUploadDraft } from "@/components/upload-draft-provider";
import {
  batchFileKey,
  batchUploadConcurrency,
  maxBatchGarments,
  runWithConcurrency,
} from "@/features/wardrobe/domain/batch-import";
import {
  canPreviewPhoto,
  isSupportedPhoto,
  maxPhotoSizeBytes,
  photoInputAccept,
} from "@/features/wardrobe/domain/photo-files";

type ImportStatus = "waiting" | "uploading" | "added" | "failed";

type ImportEntry = {
  id: string;
  file: File;
  preview: string | null;
  status: ImportStatus;
  error: string;
  itemId: string | null;
};

type UploadResponse = {
  itemId?: unknown;
  error?: { message?: unknown };
};

const statusStyles: Record<ImportStatus, string> = {
  waiting: "border-line bg-canvas text-ink/60",
  uploading: "border-citrus bg-citrus/70 text-ink",
  added: "border-teal/25 bg-mist text-teal-dark",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function createEntry(file: File): ImportEntry {
  return {
    id: batchFileKey(file),
    file,
    preview: canPreviewPhoto(file) ? URL.createObjectURL(file) : null,
    status: "waiting",
    error: "",
    itemId: null,
  };
}

function fileError(file: File) {
  if (!isSupportedPhoto(file))
    return `${file.name} isn’t supported. Choose JPG, PNG, HEIC, or WebP photos.`;
  if (file.size > maxPhotoSizeBytes)
    return `${file.name} is larger than 12MB. Choose a smaller photo.`;
  return null;
}

export function BatchUploadForm() {
  const { trackAnalysis } = useAnalysisStatus();
  const { batchFiles, setBatchFiles, clearBatchFiles } = useUploadDraft();
  const [entries, setEntries] = useState<ImportEntry[]>(() => batchFiles.map(createEntry));
  const entriesRef = useRef(entries);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(
    () => () => {
      entriesRef.current.forEach((entry) => {
        if (entry.preview) URL.revokeObjectURL(entry.preview);
      });
    },
    [],
  );

  const addedCount = entries.filter((entry) => entry.status === "added").length;
  const failedCount = entries.filter((entry) => entry.status === "failed").length;
  const uploadingCount = entries.filter((entry) => entry.status === "uploading").length;
  const processedCount = addedCount + failedCount;
  const finished = started && !running && uploadingCount === 0;

  function addFiles(selectedFiles: File[]) {
    if (!selectedFiles.length || started) return;
    const validationErrors: string[] = [];
    const currentKeys = new Set(entries.map((entry) => entry.id));
    const accepted: File[] = [];
    let duplicateCount = 0;
    let overflowCount = 0;

    for (const file of selectedFiles) {
      const validationError = fileError(file);
      if (validationError) {
        validationErrors.push(validationError);
        continue;
      }
      const key = batchFileKey(file);
      if (currentKeys.has(key)) {
        duplicateCount += 1;
        continue;
      }
      if (entries.length + accepted.length >= maxBatchGarments) {
        overflowCount += 1;
        continue;
      }
      currentKeys.add(key);
      accepted.push(file);
    }

    if (accepted.length) {
      setEntries((current) => [...current, ...accepted.map(createEntry)]);
      setBatchFiles((current) => [...current, ...accepted]);
    }

    const messages = [
      ...validationErrors,
      duplicateCount
        ? `${duplicateCount} duplicate ${duplicateCount === 1 ? "photo was" : "photos were"} left out.`
        : "",
      overflowCount
        ? `This batch can contain up to ${maxBatchGarments} garments. Extra photos were left out.`
        : "",
    ].filter(Boolean);
    setError(!accepted.length && messages.length ? messages.join(" ") : "");
    setNotice(accepted.length && messages.length ? messages.join(" ") : "");
  }

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function dropFiles(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeEntry(id: string) {
    if (started) return;
    const removed = entries.find((entry) => entry.id === id);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    setBatchFiles(next.map((entry) => entry.file));
    setNotice("");
    setError("");
  }

  async function uploadEntry(entry: ImportEntry) {
    setEntries((current) =>
      current.map((candidate) =>
        candidate.id === entry.id ? { ...candidate, status: "uploading", error: "" } : candidate,
      ),
    );
    const form = new FormData();
    form.append("photos", entry.file);

    try {
      const response = await fetch("/api/items", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as UploadResponse | null;
      if (!response.ok) {
        throw new Error(
          typeof payload?.error?.message === "string"
            ? payload.error.message
            : "Upload failed. Please try again.",
        );
      }
      if (typeof payload?.itemId !== "string")
        throw new Error("The upload finished unexpectedly. Please try again.");
      trackAnalysis(payload.itemId);
      setEntries((current) =>
        current.map((candidate) =>
          candidate.id === entry.id
            ? { ...candidate, status: "added", itemId: payload.itemId as string, error: "" }
            : candidate,
        ),
      );
    } catch (uploadError) {
      setEntries((current) =>
        current.map((candidate) =>
          candidate.id === entry.id
            ? {
                ...candidate,
                status: "failed",
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Upload failed. Please try again.",
              }
            : candidate,
        ),
      );
    }
  }

  async function startImport() {
    const waiting = entries.filter((entry) => entry.status === "waiting");
    if (!waiting.length || running) return;
    setStarted(true);
    setRunning(true);
    setError("");
    setNotice("");
    clearBatchFiles();
    await runWithConcurrency(waiting, batchUploadConcurrency, uploadEntry);
    setRunning(false);
  }

  async function retry(entry: ImportEntry) {
    if (entry.status !== "failed") return;
    await uploadEntry(entry);
  }

  function reset() {
    entries.forEach((entry) => {
      if (entry.preview) URL.revokeObjectURL(entry.preview);
    });
    setEntries([]);
    clearBatchFiles();
    setStarted(false);
    setRunning(false);
    setError("");
    setNotice("");
  }

  return (
    <div className="mt-9 max-w-6xl">
      <section className="rounded-3xl border border-line bg-canvas p-5 shadow-[6px_6px_0_var(--color-mist)] sm:p-8">
        <div
          className={`flex min-h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
            started
              ? "border-line bg-mist/50"
              : dragging
                ? "border-berry bg-peach/60 shadow-[inset_0_0_0_2px_var(--color-berry)]"
                : "border-teal/50 bg-mist/50"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!started) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDragging(false);
          }}
          onDrop={dropFiles}
        >
          <Images size={32} className="text-berry" aria-hidden="true" />
          <strong className="mt-4 text-xl">
            {entries.length
              ? `${entries.length} ${entries.length === 1 ? "garment" : "garments"} in this batch`
              : dragging
                ? "Drop your photos here"
                : "Choose your garment photos"}
          </strong>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
            Add one photo per garment. Each photo is imported as its own garment.
          </p>
          {!started && (
            <Button
              className="mt-5"
              type="button"
              variant="secondary"
              disabled={entries.length >= maxBatchGarments}
              onClick={() => inputRef.current?.click()}
            >
              <Images size={17} aria-hidden="true" />
              {entries.length ? "Choose more photos" : "Choose photos"}
            </Button>
          )}
          <span className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50">
            One garment per photo · up to {maxBatchGarments} garments · 12MB each
          </span>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept={photoInputAccept}
            multiple
            disabled={started}
            onChange={chooseFiles}
          />
        </div>

        {entries.length > 0 && (
          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            aria-label="Garments selected for import"
          >
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-canvas"
              >
                <div className="relative">
                  {entry.preview ? (
                    <img
                      src={entry.preview}
                      alt={`Garment photo ${index + 1}`}
                      className="aspect-[4/5] w-full bg-mist object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/5] place-items-center bg-mist text-center text-ink/55">
                      <div>
                        <FileImage className="mx-auto text-teal" size={28} aria-hidden="true" />
                        <span className="mt-2 block text-xs">Preview unavailable</span>
                      </div>
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide ${statusStyles[entry.status]}`}
                  >
                    {entry.status === "uploading" && (
                      <LoaderCircle size={10} className="animate-spin" aria-hidden="true" />
                    )}
                    {entry.status === "added" && <Check size={10} aria-hidden="true" />}
                    {entry.status === "failed" && <CircleAlert size={10} aria-hidden="true" />}
                    {entry.status}
                  </span>
                  {!started && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-ink/80 text-canvas transition hover:bg-berry focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={`Remove ${entry.file.name} from batch`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="flex flex-1 flex-col border-t border-line px-3 py-3">
                  <span className="truncate font-mono text-[10px] text-ink/55">
                    {entry.file.name}
                  </span>
                  {entry.error && (
                    <p className="mt-2 text-xs leading-5 text-red-700" role="alert">
                      {entry.error}
                    </p>
                  )}
                  {entry.status === "failed" && (
                    <Button
                      className="mt-auto pt-3"
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => retry(entry)}
                    >
                      <RotateCcw size={13} aria-hidden="true" /> Retry
                    </Button>
                  )}
                  {entry.status === "added" && entry.itemId && (
                    <Link
                      className="mt-auto pt-3 text-xs font-bold text-teal hover:underline"
                      href={`/items/${entry.itemId}`}
                    >
                      Open garment
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {started && entries.length > 0 && (
          <div className="mt-6" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm">
              <strong>
                {processedCount} of {entries.length} processed
              </strong>
              <span className="text-ink/55">
                {addedCount} added{failedCount ? ` · ${failedCount} failed` : ""}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={entries.length}
              aria-valuenow={processedCount}
            >
              <div
                className="h-full rounded-full bg-teal transition-[width]"
                style={{ width: `${(processedCount / entries.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {notice && (
          <p className="mt-5 rounded-xl bg-citrus/30 px-4 py-3 text-sm text-ink" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!started && (
          <Button
            className="mt-6 w-full"
            type="button"
            size="lg"
            disabled={!entries.length}
            onClick={startImport}
          >
            <Upload size={17} aria-hidden="true" />
            Import {entries.length || ""} {entries.length === 1 ? "garment" : "garments"}
          </Button>
        )}

        {running && (
          <p className="mt-3 text-center text-sm text-ink/60" role="status">
            Photos are being optimized and saved. Please keep this page open.
          </p>
        )}

        {finished && (
          <div className="mt-6 rounded-2xl border border-line bg-mist/60 p-5">
            <h2 className="text-xl font-bold tracking-[-0.035em]">
              {failedCount
                ? `${addedCount} added, ${failedCount} need attention`
                : `${addedCount} ${addedCount === 1 ? "garment" : "garments"} added`}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {failedCount
                ? "Retry the failed photos above. Successful garments are already in your wardrobe."
                : "Your new garments are ready. AI details will continue filling in where enabled."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/wardrobe"
                className="inline-flex h-11 items-center justify-center rounded-full bg-berry px-5 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
              >
                View wardrobe
              </Link>
              {!failedCount && (
                <Button type="button" variant="outline" onClick={reset}>
                  Import another batch
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
