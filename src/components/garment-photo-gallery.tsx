/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Expand, Images, RotateCcw, RotateCw, Star, Trash2 } from "lucide-react";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";
import { Button } from "@/components/ui/button";
import { maxPhotosPerGarment, photoInputAccept } from "@/features/wardrobe/domain/photo-files";

type Photo = { id: string; src: string };

async function message(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error?.message ?? "Couldn’t update photos.";
}

export function GarmentPhotoGallery({
  itemId,
  itemName,
  photos,
}: {
  itemId: string;
  itemName: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const replacements = useRef<Record<string, HTMLInputElement | null>>({});
  const name = itemName || "Untitled garment";
  const images: ViewerImage[] = photos.map((photo, index) => ({
    src: photo.src,
    alt: `${name}, photo ${index + 1}`,
    label: `${name} · photo ${index + 1}`,
  }));

  async function mutate(request: () => Promise<Response>, success: string) {
    setPending(true);
    setStatus("");
    try {
      const response = await request();
      if (!response.ok) return setStatus(await message(response));
      setStatus(success);
      router.refresh();
    } catch {
      setStatus("Couldn’t update photos. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }
  function add(files: File[]) {
    if (!files.length) return;
    void mutate(() => {
      const form = new FormData();
      files.forEach((file) => form.append("photos", file));
      return fetch(`/api/items/${itemId}/photos`, { method: "POST", body: form });
    }, "Photos added.");
  }
  const rotate = (id: string, direction: "left" | "right") =>
    mutate(
      () =>
        fetch(`/api/photos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rotate", direction }),
        }),
      "Photo rotated.",
    );

  return (
    <>
      <section className="self-start">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">
            Photos{" "}
            <span className="font-normal text-ink/55">
              {photos.length} of {maxPhotosPerGarment}
            </span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setManaging((value) => !value)}>
            {managing ? "Done" : "Manage photos"}
          </Button>
        </div>
        {status && (
          <p role="status" className="mb-4 rounded-xl bg-mist px-4 py-3 text-sm text-teal-dark">
            {status}
          </p>
        )}
        {managing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-line bg-canvas"
                >
                  <div className="relative">
                    <img
                      src={photo.src}
                      alt={`${name}, photo ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-berry px-2 py-1 text-xs font-bold text-canvas">
                        Main
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 p-2">
                    {index !== 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          void mutate(
                            () =>
                              fetch(`/api/photos/${photo.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "set-cover" }),
                              }),
                            "Main photo updated.",
                          )
                        }
                      >
                        <Star size={13} />
                        Set as main
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Rotate photo ${index + 1} left`}
                      disabled={pending}
                      onClick={() => void rotate(photo.id, "left")}
                    >
                      <RotateCcw size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Rotate photo ${index + 1} right`}
                      disabled={pending}
                      onClick={() => void rotate(photo.id, "right")}
                    >
                      <RotateCw size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => replacements.current[photo.id]?.click()}
                    >
                      Replace
                    </Button>
                    <input
                      ref={(node) => {
                        replacements.current[photo.id] = node;
                      }}
                      hidden
                      type="file"
                      accept={photoInputAccept}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file)
                          void mutate(() => {
                            const form = new FormData();
                            form.append("photo", file);
                            return fetch(`/api/photos/${photo.id}`, { method: "PUT", body: form });
                          }, "Photo replaced.");
                      }}
                    />
                    {photos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:text-red-700"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm("Remove this photo?"))
                            void mutate(
                              () => fetch(`/api/photos/${photo.id}`, { method: "DELETE" }),
                              "Photo removed.",
                            );
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {photos.length >= maxPhotosPerGarment ? (
              <p className="rounded-xl bg-mist px-4 py-3 text-sm text-ink/65">
                Six-photo limit reached. Replace or remove a photo to make space.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => camera.current?.click()}
                >
                  <Camera size={16} />
                  Take a photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => library.current?.click()}
                >
                  <Images size={16} />
                  Choose photos
                </Button>
                <span className="text-sm text-ink/55">
                  {photos.length} of {maxPhotosPerGarment} photos
                </span>
                <input
                  ref={camera}
                  hidden
                  type="file"
                  accept={photoInputAccept}
                  capture="environment"
                  onChange={(event) => {
                    add(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
                <input
                  ref={library}
                  hidden
                  type="file"
                  accept={photoInputAccept}
                  multiple
                  onChange={(event) => {
                    add(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                className={`group relative overflow-hidden rounded-2xl bg-mist text-left shadow-[4px_4px_0_var(--color-peach)] outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-4 ${index === 0 ? "sm:col-span-2" : ""}`}
                onClick={() => setSelectedIndex(index)}
                aria-label={`View larger ${image.alt}`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${index === 0 ? "aspect-[4/5] max-h-[46rem]" : "aspect-square"}`}
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-bold text-canvas opacity-0 transition group-hover:opacity-100">
                  <Expand size={14} />
                  View
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <ImageViewerDialog
        images={images}
        activeIndex={selectedIndex ?? 0}
        onActiveIndexChange={setSelectedIndex}
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      />
    </>
  );
}
