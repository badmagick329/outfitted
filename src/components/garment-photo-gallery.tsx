/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";

type GarmentPhotoGalleryProps = {
  itemName: string;
  photos: Array<{ id: string; src: string }>;
};

export function GarmentPhotoGallery({ itemName, photos }: GarmentPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const displayName = itemName || "Untitled garment";
  const images: ViewerImage[] = photos.map((photo, index) => ({
    src: photo.src,
    alt: `${displayName}, photo ${index + 1}`,
    label: `${displayName} · photo ${index + 1}`,
  }));

  return (
    <>
      <div className="grid gap-4 self-start sm:grid-cols-2">
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
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-bold text-canvas opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Expand size={14} aria-hidden="true" /> View
            </span>
          </button>
        ))}
      </div>
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
