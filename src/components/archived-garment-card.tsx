/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";

type ArchivedGarmentCardProps = {
  id: string;
  name: string;
  category: string | null;
  coverPhotoId: string | null;
  archivedLabel: string;
};

async function messageFrom(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.error?.message ?? "Couldn’t restore this garment.";
}

export function ArchivedGarmentCard({
  id,
  name,
  category,
  coverPhotoId,
  archivedLabel,
}: ArchivedGarmentCardProps) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const hasVisibleDetails = Boolean(name || category);
  const accessibleName = name || category || "garment";

  async function restore() {
    setRestoring(true);
    setError("");
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: null }),
      });
      if (!response.ok) {
        setError(await messageFrom(response));
        return;
      }
      setRestored(true);
      router.refresh();
    } catch {
      setError("Couldn’t restore this garment. Check your connection and try again.");
    } finally {
      setRestoring(false);
    }
  }

  if (restored) return null;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-[4px_4px_0_var(--color-mist)]">
      <Link
        href={`/items/${id}`}
        aria-label={`Open archived ${accessibleName}`}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-berry"
      >
        {coverPhotoId ? (
          <img
            src={`/api/photos/${coverPhotoId}`}
            alt={name || category || "Archived garment"}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid aspect-[4/5] place-items-center bg-mist text-teal/45">
            <Shirt size={36} aria-hidden="true" />
          </div>
        )}
        {hasVisibleDetails && (
          <div className="border-t border-line px-4 py-3">
            {name && <strong className="block break-words leading-tight">{name}</strong>}
            {category && (
              <span className={`${name ? "mt-1" : ""} block text-sm text-ink/60`}>{category}</span>
            )}
          </div>
        )}
      </Link>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/55">
          Archived {archivedLabel}
        </span>
        <Button variant="ghost" size="sm" onClick={restore} disabled={restoring}>
          {restoring ? (
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw size={14} aria-hidden="true" />
          )}
          {restoring ? "Restoring…" : "Restore"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="border-t border-line bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}
