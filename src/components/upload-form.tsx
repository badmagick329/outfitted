/* eslint-disable @next/next/no-img-element -- local object URLs are required for pre-upload previews. */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";

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
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  const previewImages: ViewerImage[] = previews.map((src, index) => ({
    src,
    alt: `Selected garment photo ${index + 1}`,
    label: files[index]?.name,
  }));

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    const nonImage = selectedFiles.find((file) => !file.type.startsWith("image/"));
    if (nonImage) {
      setError(`${nonImage.name} isn’t an image. Choose JPG, PNG, HEIC, or WebP files.`);
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
      current.forEach(URL.revokeObjectURL);
      return nextFiles.map((file) => URL.createObjectURL(file));
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

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((current) => {
      URL.revokeObjectURL(current[index]);
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
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2 ${loading ? "pointer-events-none border-line bg-mist opacity-70" : "border-teal/50 bg-mist/50 hover:border-berry hover:bg-peach/40"}`}
      >
        <ImagePlus size={32} className="text-berry" />
        <strong className="mt-4 text-lg">
          {files.length
            ? `${files.length} ${files.length === 1 ? "photo" : "photos"} selected`
            : "Choose garment photos"}
        </strong>
        <span id="photo-requirements" className="mt-2 text-sm text-ink/60">
          {files.length
            ? "Choose again to replace this selection"
            : "JPG, PNG, HEIC or WebP · up to 12MB each"}
        </span>
        <span className="mt-1 max-w-md text-sm text-ink/60">
          For the clearest result, fill the frame and use a background that contrasts with the
          garment.
        </span>
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          disabled={loading}
          aria-describedby="photo-requirements"
          onChange={chooseFiles}
        />
      </label>

      {previews.length > 0 && (
        <div
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Selected photo previews"
        >
          {previews.map((preview, index) => (
            <figure
              key={preview}
              className="relative overflow-hidden rounded-xl border border-line bg-mist"
            >
              <button
                type="button"
                className="group block w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                onClick={() => setSelectedPreview(index)}
                aria-label={`View larger selected garment photo ${index + 1}`}
              >
                <img
                  src={preview}
                  alt={`Selected garment photo ${index + 1}`}
                  className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-ink/80 text-canvas transition hover:bg-berry focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${files[index]?.name ?? `photo ${index + 1}`} from selection`}
              >
                <X size={14} />
              </button>
              <figcaption className="truncate px-2 py-2 font-mono text-[10px] text-ink/60">
                {files[index]?.name}
              </figcaption>
            </figure>
          ))}
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
        {loading && <LoaderCircle className="animate-spin" size={17} />}
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
