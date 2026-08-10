/* eslint-disable @next/next/no-img-element -- local object URLs are required for pre-upload previews. */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImage, ImagePlus, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";
import {
  canPreviewPhoto,
  isSupportedPhoto,
  photoInputAccept,
} from "@/features/wardrobe/domain/photo-files";

const maxPhotos = 6;
const maxPhotoSize = 12 * 1024 * 1024;

type UploadResponse = {
  itemId?: unknown;
  error?: { message?: unknown };
};

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<Array<string | null>>([]);
  const previewsRef = useRef(previews);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  const previewImages: ViewerImage[] = previews.flatMap((src, index) =>
    src
      ? [
          {
            src,
            alt: `Selected garment photo ${index + 1}`,
            label: files[index]?.name,
          },
        ]
      : [],
  );

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(
    () => () => {
      previewsRef.current.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    },
    [],
  );

  function selectFiles(selectedFiles: File[]) {
    if (!selectedFiles.length) return;
    const unsupported = selectedFiles.find((file) => !isSupportedPhoto(file));
    if (unsupported) {
      setError(`${unsupported.name} isn’t supported. Choose JPG, PNG, HEIC, or WebP photos.`);
      setNotice("");
      return;
    }

    const oversized = selectedFiles.find((file) => file.size > maxPhotoSize);
    if (oversized) {
      setError(`${oversized.name} is larger than 12MB. Choose a smaller photo.`);
      setNotice("");
      return;
    }

    const nextFiles = selectedFiles.slice(0, maxPhotos);
    setPreviews((current) => {
      current.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      return nextFiles.map((file) => (canPreviewPhoto(file) ? URL.createObjectURL(file) : null));
    });
    setFiles(nextFiles);
    setSelectedPreview(null);
    setError("");
    setNotice(
      selectedFiles.length > maxPhotos
        ? "You can upload up to six photos. We kept the first six you selected."
        : "",
    );
  }

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    selectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function dropFiles(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (loading) return;
    selectFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setSelectedPreview(null);
    setNotice("");
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!files.length) return setError("Choose at least one image.");
    setLoading(true);
    setError("");
    const form = new FormData();
    files.forEach((file) => form.append("photos", file));
    try {
      const response = await fetch("/api/items", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as UploadResponse | null;
      if (!response.ok) {
        setLoading(false);
        return setError(
          typeof payload?.error?.message === "string"
            ? payload.error.message
            : "Upload failed. Please try again.",
        );
      }
      if (typeof payload?.itemId !== "string") {
        setLoading(false);
        return setError("The upload finished unexpectedly. Please try again.");
      }
      router.push(`/items/${payload.itemId}`);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Upload failed. Check your connection and try again.");
    }
  }

  return (
    <form
      className="mt-9 max-w-4xl rounded-3xl border border-line bg-canvas p-5 shadow-[6px_6px_0_var(--color-mist)] sm:p-8"
      onSubmit={upload}
      aria-busy={loading}
    >
      <label
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2 ${loading ? "pointer-events-none border-line bg-mist opacity-70" : dragging ? "border-berry bg-peach/60 shadow-[inset_0_0_0_2px_var(--color-berry)]" : "border-teal/50 bg-mist/50 hover:border-berry hover:bg-peach/40"}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={dropFiles}
      >
        <ImagePlus size={32} className="text-berry" aria-hidden="true" />
        <strong className="mt-4 text-lg">
          {files.length
            ? `${files.length} ${files.length === 1 ? "photo" : "photos"} selected`
            : dragging
              ? "Drop your photos here"
              : "Choose or drop garment photos"}
        </strong>
        <span id="photo-requirements" className="mt-2 text-sm text-ink/60">
          {files.length
            ? "Choose or drop again to replace this selection"
            : "JPG, PNG, HEIC or WebP · up to 12MB each"}
        </span>
        <span className="mt-1 max-w-md text-sm text-ink/60">
          For the clearest result, fill the frame and use a background that contrasts with the
          garment.
        </span>
        <input
          className="sr-only"
          type="file"
          accept={photoInputAccept}
          multiple
          disabled={loading}
          aria-describedby="photo-requirements"
          onChange={chooseFiles}
        />
      </label>

      {files.length > 0 && (
        <div
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Selected photo previews"
        >
          {files.map((file, index) => {
            const preview = previews[index];
            const viewerIndex = previews.slice(0, index).filter(Boolean).length;

            return (
              <figure
                key={`${file.name}-${file.lastModified}-${index}`}
                className="relative overflow-hidden rounded-xl border border-line bg-mist"
              >
                {preview ? (
                  <button
                    type="button"
                    className="group block w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                    onClick={() => setSelectedPreview(viewerIndex)}
                    aria-label={`View larger selected garment photo ${index + 1}`}
                  >
                    <img
                      src={preview}
                      alt={`Selected garment photo ${index + 1}`}
                      className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    />
                  </button>
                ) : (
                  <div className="grid aspect-square place-items-center px-3 text-center text-ink/55">
                    <div>
                      <FileImage className="mx-auto text-teal" size={26} aria-hidden="true" />
                      <span className="mt-2 block text-xs">Preview unavailable</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-ink/80 text-canvas transition hover:bg-berry focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${files[index]?.name ?? `photo ${index + 1}`} from selection`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
                <figcaption className="truncate px-2 py-2 font-mono text-[10px] text-ink/60">
                  {file.name}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <ImageViewerDialog
        images={previewImages}
        activeIndex={selectedPreview ?? 0}
        onActiveIndexChange={setSelectedPreview}
        open={selectedPreview !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPreview(null);
        }}
      />

      {notice && (
        <p className="mt-4 rounded-xl bg-citrus/30 px-4 py-3 text-sm text-ink" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button className="mt-6 w-full" type="submit" disabled={loading} size="lg">
        {loading && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}
        {loading ? "Adding to wardrobe…" : "Add to wardrobe"}
      </Button>
      {loading && (
        <p className="mt-3 text-center text-sm text-ink/60" role="status" aria-live="polite">
          Your photos are being optimized and saved. Please keep this page open.
        </p>
      )}
    </form>
  );
}
