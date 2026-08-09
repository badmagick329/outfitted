/* eslint-disable @next/next/no-img-element -- the viewer displays private routes and local object URLs. */
"use client";

import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewerImage = { src: string; alt: string; label?: string };

type ImageViewerDialogProps = {
  images: ViewerImage[];
  activeIndex: number;
  onActiveIndexChange(index: number): void;
  open: boolean;
  onOpenChange(open: boolean): void;
};

export function ImageViewerDialog({
  images,
  activeIndex,
  onActiveIndexChange,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  const activeImage = images[activeIndex];

  if (!activeImage) return null;
  const hasMultipleImages = images.length > 1;
  const previous = () => onActiveIndexChange((activeIndex - 1 + images.length) % images.length);
  const next = () => onActiveIndexChange((activeIndex + 1) % images.length);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-4 z-50 grid place-items-center outline-none sm:inset-8">
          <Dialog.Title className="sr-only">Garment photo viewer</Dialog.Title>
          <Dialog.Description className="sr-only">{activeImage.alt}</Dialog.Description>
          <div className="relative flex max-h-full w-full max-w-6xl flex-col items-center justify-center">
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute right-0 top-0 z-10 grid size-10 place-items-center rounded-full bg-ink/75 text-canvas transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-citrus"
                aria-label="Close image viewer"
              >
                <X size={19} />
              </button>
            </Dialog.Close>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[70vh] max-w-full rounded-2xl border border-canvas/20 bg-ink object-contain shadow-2xl sm:max-h-[76vh]"
            />
            <div className="mt-3 flex w-full items-center justify-between gap-3 text-canvas">
              <span className="min-w-0 truncate font-mono text-xs">{activeImage.label}</span>
              {hasMultipleImages && (
                <span className="shrink-0 font-mono text-xs">
                  {activeIndex + 1} / {images.length}
                </span>
              )}
            </div>
            {hasMultipleImages && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 border-canvas/30 bg-ink/70 text-canvas hover:bg-ink hover:text-canvas"
                  onClick={previous}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-0 top-1/2 -translate-y-1/2 border-canvas/30 bg-ink/70 text-canvas hover:bg-ink hover:text-canvas"
                  onClick={next}
                  aria-label="Next photo"
                >
                  <ChevronRight size={20} />
                </Button>
                <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
                  {images.map((image, index) => (
                    <button
                      key={image.src}
                      type="button"
                      onClick={() => onActiveIndexChange(index)}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 ${index === activeIndex ? "border-citrus" : "border-transparent opacity-65 hover:opacity-100"}`}
                      aria-label={`View photo ${index + 1}`}
                    >
                      <img src={image.src} alt="" className="size-12 object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
