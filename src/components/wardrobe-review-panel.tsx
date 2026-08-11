/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  ListChecks,
  LoaderCircle,
  Palette,
  RefreshCw,
  Shirt,
} from "lucide-react";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";
import { Button } from "@/components/ui/button";
import type {
  WardrobeReviewEntry,
  WardrobeReviewReferencedItem,
  WardrobeReviewView,
} from "@/features/wardrobe-review/domain/contracts";

type ErrorResponse = { error?: { message?: unknown } };

async function responseMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as ErrorResponse | null;
  return typeof payload?.error?.message === "string"
    ? payload.error.message
    : "Something went wrong. Please try again.";
}

function ReviewReferences({
  itemIds,
  items,
  onOpen,
}: {
  itemIds: string[];
  items: Map<string, WardrobeReviewReferencedItem>;
  onOpen(itemId: string): void;
}) {
  const referenced = itemIds
    .map((id) => items.get(id))
    .filter((item): item is WardrobeReviewReferencedItem => Boolean(item));
  if (!referenced.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Relevant garments">
      {referenced.map((item) =>
        item.coverPhotoId ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="group flex max-w-48 items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pr-3 text-left transition hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          >
            <img
              src={`/api/photos/${item.coverPhotoId}?variant=thumbnail`}
              alt=""
              className="size-10 shrink-0 rounded-lg bg-mist object-cover"
            />
            <span className="truncate text-xs font-bold group-hover:text-teal">{item.name}</span>
          </button>
        ) : (
          <span
            key={item.id}
            className="inline-flex items-center rounded-full border border-line bg-canvas px-3 py-2 text-xs font-bold"
          >
            {item.name}
          </span>
        ),
      )}
    </div>
  );
}

function ReviewSection({
  title,
  entries,
  items,
  onOpen,
  tone,
}: {
  title: string;
  entries: WardrobeReviewEntry[];
  items: Map<string, WardrobeReviewReferencedItem>;
  onOpen(itemId: string): void;
  tone: "mist" | "peach" | "plain";
}) {
  if (!entries.length) return null;
  const tones = { mist: "bg-mist/65", peach: "bg-peach/45", plain: "bg-canvas" };

  return (
    <section>
      <h2 className="text-2xl font-bold tracking-[-0.04em]">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <article
            key={`${entry.title}:${entry.detail}`}
            className={`rounded-2xl border border-line p-5 ${tones[tone]}`}
          >
            <h3 className="text-lg font-bold tracking-[-0.025em]">{entry.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">{entry.detail}</p>
            <ReviewReferences itemIds={entry.itemIds} items={items} onOpen={onOpen} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function WardrobeReviewPanel({ initialView }: { initialView: WardrobeReviewView }) {
  const [view, setView] = useState(initialView);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const active = view.review?.status === "pending" || view.review?.status === "processing";

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      try {
        const response = await fetch("/api/wardrobe-reviews", { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response));
        const next = (await response.json()) as WardrobeReviewView;
        if (cancelled) return;
        setView(next);
        if (next.review?.status === "pending" || next.review?.status === "processing")
          timer = window.setTimeout(poll, 1_800);
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : "Unable to update the review.");
        timer = window.setTimeout(poll, 3_000);
      }
    };
    timer = window.setTimeout(poll, 1_800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, view.review?.id]);

  async function requestReview() {
    if (submitting || active) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/wardrobe-reviews", { method: "POST" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setView((await response.json()) as WardrobeReviewView);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to start the review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const items = useMemo(
    () => new Map(view.review?.referencedItems.map((item) => [item.id, item]) ?? []),
    [view.review?.referencedItems],
  );
  const viewerItems = useMemo(
    () => (view.review?.referencedItems ?? []).filter((item) => item.coverPhotoId),
    [view.review?.referencedItems],
  );
  const viewerImages: ViewerImage[] = viewerItems.map((item) => ({
    src: `/api/photos/${item.coverPhotoId}`,
    alt: item.name,
    label: item.name,
  }));
  function openItem(itemId: string) {
    const index = viewerItems.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    setViewerIndex(index);
    setViewerOpen(true);
  }

  if (!view.currentItemCount) {
    return (
      <section className="mt-9 max-w-2xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8 sm:p-10">
        <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
          <Shirt size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em]">Add something first</h2>
        <p className="mt-2 text-ink/65">
          Your review will be based on the garments in your wardrobe.
        </p>
        <Link
          href="/upload"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-berry px-5 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)]"
        >
          Add a garment
        </Link>
      </section>
    );
  }

  if (!view.review) {
    return (
      <section className="mt-9 max-w-3xl rounded-3xl border border-line bg-canvas p-6 shadow-[6px_6px_0_var(--color-peach)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-berry">
              Ready to review
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em]">
              {view.currentItemCount} {view.currentItemCount === 1 ? "garment" : "garments"}
            </h2>
          </div>
          {view.currentHasStyleProfile ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-2 text-xs font-bold text-teal">
              <Palette size={14} aria-hidden="true" /> Your style included
            </span>
          ) : (
            <Link href="/style" className="text-sm font-bold text-teal hover:underline">
              Add your style <span className="font-normal text-ink/50">optional</span>
            </Link>
          )}
        </div>
        <Button className="mt-8" size="lg" onClick={requestReview} disabled={submitting}>
          {submitting ? (
            <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
          ) : (
            <ListChecks size={17} aria-hidden="true" />
          )}
          Review my wardrobe
        </Button>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </section>
    );
  }

  if (active) {
    return (
      <section className="mt-9 max-w-3xl rounded-3xl border border-line bg-canvas p-7 shadow-[6px_6px_0_var(--color-peach)] sm:p-9">
        <div className="flex items-start gap-4">
          <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
            <LoaderCircle size={22} className="animate-spin" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.04em]">Reviewing your wardrobe</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              You can leave this page. Your review will be here when it is ready.
            </p>
          </div>
        </div>
        {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
      </section>
    );
  }

  if (view.review.status === "failed") {
    return (
      <section className="mt-9 max-w-3xl rounded-3xl border border-line bg-canvas p-7 shadow-[6px_6px_0_var(--color-peach)] sm:p-9">
        <CircleAlert size={25} className="text-red-700" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em]">The review did not finish</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          {view.review.error ?? "Please try again."}
        </p>
        <Button className="mt-6" onClick={requestReview} disabled={submitting}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </Button>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </section>
    );
  }

  const report = view.review.report;
  if (!report) return null;

  return (
    <div className="mt-9 space-y-9">
      {view.review.isStale && (
        <div className="flex max-w-4xl items-start gap-3 rounded-2xl border border-citrus bg-citrus/25 px-4 py-3 text-sm">
          <RefreshCw size={17} className="mt-0.5 shrink-0 text-berry" aria-hidden="true" />
          <span>Your wardrobe has changed since this review.</span>
        </div>
      )}

      <section className="max-w-4xl rounded-3xl border border-line bg-canvas p-6 shadow-[6px_6px_0_var(--color-peach)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
            <CheckCircle2 size={15} aria-hidden="true" /> {view.review.reviewedItemCount} garments
            reviewed
          </span>
          {view.review.usedStyleProfile && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/55">
              <Palette size={13} aria-hidden="true" /> Your style included
            </span>
          )}
        </div>
        <p className="mt-5 text-xl leading-8 tracking-[-0.02em] text-ink/80 sm:text-2xl sm:leading-9">
          {report.summary}
        </p>
      </section>

      <ReviewSection
        title="Already covered"
        entries={report.strengths}
        items={items}
        onOpen={openItem}
        tone="mist"
      />

      {report.gaps.length ? (
        <ReviewSection
          title="Worth considering"
          entries={report.gaps}
          items={items}
          onOpen={openItem}
          tone="peach"
        />
      ) : (
        <section className="max-w-4xl rounded-2xl border border-teal/25 bg-mist/70 p-5">
          <h2 className="text-xl font-bold tracking-[-0.035em]">No obvious gaps</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Nothing clearly missing stands out from what you have added.
          </p>
        </section>
      )}

      <ReviewSection
        title="Other observations"
        entries={report.observations}
        items={items}
        onOpen={openItem}
        tone="plain"
      />

      <div className="border-t border-line pt-6">
        <Button variant="outline" onClick={requestReview} disabled={submitting}>
          <RefreshCw size={16} aria-hidden="true" /> Review again
        </Button>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>

      <ImageViewerDialog
        images={viewerImages}
        activeIndex={viewerIndex}
        onActiveIndexChange={setViewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
