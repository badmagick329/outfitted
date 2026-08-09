/* eslint-disable @next/next/no-img-element -- local object URLs are required for pre-upload previews. */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 6);
    setPreviews((current) => {
      current.forEach(URL.revokeObjectURL);
      return nextFiles.map((file) => URL.createObjectURL(file));
    });
    setFiles(nextFiles);
    setError("");
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
      const payload = await response.json();
      if (!response.ok) {
        setLoading(false);
        return setError(payload.error?.message ?? "Upload failed. Please try again.");
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
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${loading ? "pointer-events-none border-line bg-mist opacity-70" : "border-teal/50 bg-mist/50 hover:border-berry hover:bg-peach/40"}`}
      >
        <ImagePlus size={32} className="text-berry" />
        <strong className="mt-4 text-lg">
          {files.length
            ? `${files.length} ${files.length === 1 ? "photo" : "photos"} selected`
            : "Choose garment photos"}
        </strong>
        <span className="mt-2 text-sm text-ink/60">
          {files.length
            ? "Choose again to replace this selection"
            : "JPG, PNG, HEIC or WebP · up to 12MB each"}
        </span>
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          disabled={loading}
          onChange={chooseFiles}
        />
      </label>

      {previews.length > 0 && (
        <div
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Selected photo previews"
        >
          {previews.map((preview, index) => (
            <figure key={preview} className="overflow-hidden rounded-xl border border-line bg-mist">
              <img
                src={preview}
                alt={`Selected garment photo ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="truncate px-2 py-2 font-mono text-[10px] text-ink/60">
                {files[index]?.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <Button className="mt-6 w-full" type="submit" disabled={loading} size="lg">
        {loading && <LoaderCircle className="animate-spin" size={17} />}
        {loading ? "Adding to wardrobe…" : "Add to wardrobe"}
      </Button>
      {loading && (
        <p className="mt-3 text-center text-sm text-ink/60">
          Your photos are being optimized and saved. Please keep this page open.
        </p>
      )}
    </form>
  );
}
