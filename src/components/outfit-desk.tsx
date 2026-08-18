/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeftRight,
  Bookmark,
  Check,
  EyeOff,
  LoaderCircle,
  Pencil,
  Shirt,
  Trash2,
  X,
} from "lucide-react";
import { ImageViewerDialog, type ViewerImage } from "@/components/image-viewer-dialog";
import { Button } from "@/components/ui/button";
import {
  removeOutfitItem,
  replaceOutfitRecommendationItem,
} from "@/features/outfits/domain/outfit-edit";

type Item = {
  id: string;
  name: string;
  category: string | null;
  coverPhotoId: string | null;
};

type Result = {
  id: string;
  recommendation: string;
  rationale: string | null;
  referencedItemIds: string[];
};

type SavedOutfit = {
  id: string;
  suggestionId: string;
  name: string;
  createdAt: string;
  recommendation: string;
  rationale: string | null;
  referencedItemIds: string[];
};

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15";
const promptExamples = [
  "A relaxed dinner in town",
  "Something comfortable for a warm afternoon",
  "A put-together outfit for a casual weekend",
];

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

async function messageFrom(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error?.message ?? fallback;
}

function itemLabel(item: Item) {
  return item.name || item.category || "Untitled garment";
}

function Recommendation({
  content,
  referencedItemIds,
  linkItems = true,
}: {
  content: string;
  referencedItemIds: string[];
  linkItems?: boolean;
}) {
  const allowedItemIds = new Set(referencedItemIds);
  return (
    <ReactMarkdown
      skipHtml
      allowedElements={["p", "ul", "ol", "li", "strong", "em", "h3", "h4", "a", "br", "code"]}
      components={{
        a({ href, children }) {
          const itemId = href?.startsWith("item:") ? href.slice(5) : "";
          if (!allowedItemIds.has(itemId)) return <>{children}</>;
          return linkItems ? (
            <Link
              className="font-bold text-berry underline decoration-citrus decoration-2 underline-offset-4 hover:text-teal"
              href={`/items/${itemId}`}
            >
              {children}
            </Link>
          ) : (
            <strong>{children}</strong>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function OutfitGarments({ itemIds, items }: { itemIds: string[]; items: Item[] }) {
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const outfitItems = itemIds.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });

  if (!outfitItems.length) return null;
  const viewerImages: ViewerImage[] = outfitItems.flatMap((item) =>
    item.coverPhotoId
      ? [
          {
            src: `/api/photos/${item.coverPhotoId}`,
            alt: itemLabel(item),
            label: itemLabel(item),
          },
        ]
      : [],
  );

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {outfitItems.map((item, index) => {
          const accessibleName = itemLabel(item);
          const hasVisibleDetails = Boolean(item.name || item.category);
          const viewerIndex = outfitItems
            .slice(0, index)
            .filter((entry) => entry.coverPhotoId).length;
          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-line bg-canvas"
            >
              {item.coverPhotoId ? (
                <button
                  type="button"
                  className="group block w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-berry"
                  onClick={() => setSelectedPreview(viewerIndex)}
                  aria-label={`View larger photo of ${accessibleName}`}
                >
                  <img
                    src={`/api/photos/${item.coverPhotoId}`}
                    alt={accessibleName}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <div className="grid aspect-[4/5] place-items-center bg-mist text-teal/45">
                  <Shirt size={28} aria-hidden="true" />
                </div>
              )}
              {hasVisibleDetails && (
                <div className="border-t border-line px-3 py-2.5">
                  {item.name && (
                    <strong className="block break-words text-sm leading-tight">{item.name}</strong>
                  )}
                  {item.category && (
                    <span className={`${item.name ? "mt-1" : ""} block text-xs text-ink/55`}>
                      {item.category}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <ImageViewerDialog
        images={viewerImages}
        activeIndex={selectedPreview ?? 0}
        onActiveIndexChange={setSelectedPreview}
        open={selectedPreview !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPreview(null);
        }}
      />
    </>
  );
}

function EditableOutfitGarments({
  itemIds,
  items,
  disabled,
  onSwapRequest,
  onRemove,
}: {
  itemIds: string[];
  items: Item[];
  disabled: boolean;
  onSwapRequest: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}) {
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const outfitItems = itemIds.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });
  const hasAlternatives = items.some((item) => !itemIds.includes(item.id));
  const viewerImages: ViewerImage[] = outfitItems.flatMap((item) =>
    item.coverPhotoId
      ? [
          {
            src: `/api/photos/${item.coverPhotoId}`,
            alt: itemLabel(item),
            label: itemLabel(item),
          },
        ]
      : [],
  );

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {outfitItems.map((item, index) => {
          const accessibleName = itemLabel(item);
          const viewerIndex = outfitItems
            .slice(0, index)
            .filter((entry) => entry.coverPhotoId).length;
          return (
            <article
              key={item.id}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-canvas"
            >
              {item.coverPhotoId ? (
                <button
                  type="button"
                  className="group block w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-berry"
                  onClick={() => setSelectedPreview(viewerIndex)}
                  aria-label={`View larger photo of ${accessibleName}`}
                >
                  <img
                    src={`/api/photos/${item.coverPhotoId}`}
                    alt={accessibleName}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <div className="grid aspect-[4/5] place-items-center bg-mist text-teal/45">
                  <Shirt size={28} aria-hidden="true" />
                </div>
              )}
              <div className="flex-1 border-t border-line px-3 py-2.5">
                <strong className="block break-words text-sm leading-tight">
                  {accessibleName}
                </strong>
                {item.name && item.category && (
                  <span className="mt-1 block text-xs text-ink/55">{item.category}</span>
                )}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-1 border-t border-line p-2">
                <Button
                  className="w-full"
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || !hasAlternatives}
                  onClick={() => onSwapRequest(item.id)}
                  aria-label={`Swap ${accessibleName}`}
                >
                  <ArrowLeftRight size={14} aria-hidden="true" />
                  Swap
                </Button>
                <Button
                  className="w-full text-red-700 hover:bg-red-50 hover:text-red-700"
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || itemIds.length <= 1}
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${accessibleName} from this outfit`}
                  aria-describedby={itemIds.length <= 1 ? "outfit-minimum-garment" : undefined}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remove
                </Button>
              </div>
              {itemIds.length <= 1 && (
                <span id="outfit-minimum-garment" className="sr-only">
                  An outfit needs at least one garment.
                </span>
              )}
            </article>
          );
        })}
      </div>
      <ImageViewerDialog
        images={viewerImages}
        activeIndex={selectedPreview ?? 0}
        onActiveIndexChange={setSelectedPreview}
        open={selectedPreview !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPreview(null);
        }}
      />
    </>
  );
}

function GarmentSwapPanel({
  currentItemId,
  itemIds,
  items,
  disabled,
  onCancel,
  onSelect,
}: {
  currentItemId: string;
  itemIds: string[];
  items: Item[];
  disabled: boolean;
  onCancel: () => void;
  onSelect: (itemId: string) => void;
}) {
  const currentItem = items.find((item) => item.id === currentItemId);
  const alternatives = items.filter((item) => !itemIds.includes(item.id));

  return (
    <section className="mt-4 rounded-2xl border border-teal/25 bg-canvas p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold">
            Swap {currentItem ? itemLabel(currentItem) : "this garment"}
          </h3>
          <p className="mt-1 text-xs text-ink/55">Choose another piece from your wardrobe.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          aria-label="Close garment choices"
        >
          <X size={15} aria-hidden="true" />
          Close
        </Button>
      </div>
      <div className="mt-4 grid max-h-[min(24rem,60vh)] grid-cols-2 gap-3 overflow-y-auto overscroll-contain rounded-xl border border-line/70 bg-mist/35 p-2 sm:grid-cols-3 lg:grid-cols-4">
        {alternatives.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.id)}
            className="overflow-hidden rounded-xl border border-line bg-mist text-left transition hover:-translate-y-0.5 hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry disabled:pointer-events-none disabled:opacity-50"
          >
            {item.coverPhotoId ? (
              <img
                src={`/api/photos/${item.coverPhotoId}`}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center text-teal/45">
                <Shirt size={24} aria-hidden="true" />
              </div>
            )}
            <span className="block break-words border-t border-line bg-canvas px-3 py-2 text-xs font-bold">
              {itemLabel(item)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EditableOutfitExplanation({
  recommendation,
  rationale,
  referencedItemIds,
  editing,
  disabled,
  onRecommendationChange,
  onRationaleChange,
  onEditingChange,
}: {
  recommendation: string;
  rationale: string | null;
  referencedItemIds: string[];
  editing: boolean;
  disabled: boolean;
  onRecommendationChange: (value: string) => void;
  onRationaleChange: (value: string) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">How to wear it</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onEditingChange(!editing)}
          >
            {editing ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Pencil size={14} aria-hidden="true" />
            )}
            {editing ? "Done" : "Edit outfit"}
          </Button>
        </div>
        {editing ? (
          <label className="mt-3 block">
            <span className="sr-only">How to wear this outfit</span>
            <textarea
              className={fieldClassName}
              value={recommendation}
              onChange={(event) => onRecommendationChange(event.target.value)}
              rows={6}
              maxLength={5000}
              disabled={disabled}
            />
          </label>
        ) : (
          <div className="prose prose-sm mt-3 max-w-none text-ink prose-headings:font-display prose-p:leading-7 prose-li:my-2">
            <Recommendation
              content={recommendation}
              referencedItemIds={referencedItemIds}
              linkItems={false}
            />
          </div>
        )}
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold">Why this works</h3>
        {editing ? (
          <label className="mt-3 block">
            <span className="sr-only">Why this outfit works</span>
            <textarea
              className={fieldClassName}
              value={rationale ?? ""}
              onChange={(event) => onRationaleChange(event.target.value)}
              rows={4}
              maxLength={3000}
              disabled={disabled}
            />
          </label>
        ) : (
          <p className="mt-2 text-sm leading-6 text-ink/65">
            {rationale || "No explanation added."}
          </p>
        )}
      </div>
    </>
  );
}

function OutfitExplanation({
  recommendation,
  rationale,
  referencedItemIds,
}: {
  recommendation: string;
  rationale: string | null;
  referencedItemIds: string[];
}) {
  return (
    <>
      <div className="prose prose-sm mt-6 max-w-none text-ink prose-headings:font-display prose-p:leading-7 prose-li:my-2">
        <Recommendation content={recommendation} referencedItemIds={referencedItemIds} />
      </div>
      {rationale && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-bold">Why this works</h3>
          <p className="mt-2 text-sm leading-6 text-ink/65">{rationale}</p>
        </div>
      )}
    </>
  );
}

export function OutfitDesk({
  items,
  catalogueItems,
  hasStyleProfile,
  initialStartingItem,
  initialSavedOutfits,
}: {
  items: Item[];
  catalogueItems: Item[];
  hasStyleProfile: boolean;
  initialStartingItem: Item | null;
  initialSavedOutfits: SavedOutfit[];
}) {
  const router = useRouter();
  const promptField = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [promptNotice, setPromptNotice] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(initialStartingItem?.id ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [resultName, setResultName] = useState("");
  const [savedOutfits, setSavedOutfits] = useState(initialSavedOutfits);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const [swappingItemId, setSwappingItemId] = useState<string | null>(null);
  const [editingRationale, setEditingRationale] = useState(false);
  const [editNotice, setEditNotice] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const submittedPrompt = prompt.trim();
    setLoading(true);
    setSaved(false);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: submittedPrompt,
          selectedItemId: selectedItemId || undefined,
        }),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t create an outfit."));
        return;
      }
      const payload = (await response.json()) as Result;
      setResult(payload);
      setResultName(submittedPrompt.slice(0, 80));
      setSaved(savedOutfits.some((outfit) => outfit.suggestionId === payload.id));
      setSwappingItemId(null);
      setEditingRationale(false);
      setEditNotice("");
    } catch {
      setError("Couldn’t create an outfit. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || saved || saving || ignoring) return;
    const savedRationale = result.rationale?.trim() || null;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/saved-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId: result.id,
          name: resultName,
          recommendation: result.recommendation,
          rationale: savedRationale,
          referencedItemIds: result.referencedItemIds,
        }),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t save this outfit."));
        return;
      }
      const payload = (await response.json()) as { id: string; createdAt: string };
      setSavedOutfits((current) => [
        {
          id: payload.id,
          suggestionId: result.id,
          name: resultName,
          createdAt: payload.createdAt,
          recommendation: result.recommendation,
          rationale: savedRationale,
          referencedItemIds: result.referencedItemIds,
        },
        ...current.filter((outfit) => outfit.suggestionId !== result.id),
      ]);
      setSaved(true);
      setSwappingItemId(null);
      setEditingRationale(false);
      setEditNotice("Outfit saved with your changes.");
    } catch {
      setError("Couldn’t save this outfit. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function ignore() {
    if (!result || saved || saving || ignoring) return;
    setIgnoring(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/ignored-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId: result.id,
          recommendation: result.recommendation,
          rationale: result.rationale?.trim() || null,
          referencedItemIds: result.referencedItemIds,
        }),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t ignore this outfit."));
        return;
      }
      setResult(null);
      setResultName("");
      setSwappingItemId(null);
      setEditingRationale(false);
      setEditNotice("");
      setNotice("Outfit ignored. This garment combination won’t be suggested again.");
    } catch {
      setError("Couldn’t ignore this outfit. Check your connection and try again.");
    } finally {
      setIgnoring(false);
    }
  }

  function swapGarment(replacementItemId: string) {
    if (!result || !swappingItemId || saving || ignoring || saved) return;
    const replacement = items.find((item) => item.id === replacementItemId);
    if (!replacement) return;
    setResult((current) =>
      current
        ? {
            ...current,
            recommendation: replaceOutfitRecommendationItem(
              current.recommendation,
              swappingItemId,
              replacement.id,
              itemLabel(replacement),
            ),
            referencedItemIds: current.referencedItemIds.map((itemId) =>
              itemId === swappingItemId ? replacementItemId : itemId,
            ),
          }
        : current,
    );
    setSwappingItemId(null);
    setEditingRationale(true);
    setEditNotice(`${itemLabel(replacement)} added. Review why the updated outfit works.`);
  }

  function removeGarment(itemId: string) {
    if (!result || saving || ignoring || saved || result.referencedItemIds.length <= 1) return;
    setResult((current) =>
      current
        ? { ...current, referencedItemIds: removeOutfitItem(current.referencedItemIds, itemId) }
        : current,
    );
    if (swappingItemId === itemId) setSwappingItemId(null);
    setEditingRationale(true);
    setEditNotice("Garment removed. Review how to wear the updated outfit and why it works.");
  }

  function removeStartingConstraint() {
    setSelectedItemId("");
    router.replace("/outfits", { scroll: false });
  }

  async function removeSaved(outfitId: string) {
    setRemovingId(outfitId);
    setRemoveErrors((current) => ({ ...current, [outfitId]: "" }));
    try {
      const response = await fetch(`/api/saved-outfits/${outfitId}`, { method: "DELETE" });
      if (!response.ok) {
        setRemoveErrors((current) => ({
          ...current,
          [outfitId]: "Couldn’t remove this saved outfit. Please try again.",
        }));
        return;
      }
      const removed = savedOutfits.find((outfit) => outfit.id === outfitId);
      setSavedOutfits((current) => current.filter((outfit) => outfit.id !== outfitId));
      if (removed?.suggestionId === result?.id) setSaved(false);
    } catch {
      setRemoveErrors((current) => ({
        ...current,
        [outfitId]: "Couldn’t remove this saved outfit. Check your connection and try again.",
      }));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-teal/15 bg-mist px-4 py-3 text-sm text-ink/70"
        >
          {notice}
        </p>
      )}
      {items.length ? (
        <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(19rem,0.7fr)_minmax(0,1fr)]">
          <form
            className="self-start rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-mist)] sm:p-7"
            onSubmit={ask}
            aria-busy={loading}
          >
            <label className="block text-sm font-bold">
              What are you dressing for?
              <textarea
                ref={promptField}
                className={fieldClassName}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setPromptNotice("");
                }}
                placeholder="A relaxed dinner in London tonight…"
                rows={5}
                required
              />
            </label>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Include the style, mood or dress code you want for this outfit.
            </p>
            <p className="sr-only" role="status" aria-live="polite">
              {promptNotice}
            </p>
            {selectedItemId && initialStartingItem ? (
              <section
                className="mt-5 rounded-xl border border-teal/20 bg-mist/55 p-3"
                aria-label="Starting garment"
              >
                <div className="flex items-center gap-3">
                  {initialStartingItem.coverPhotoId ? (
                    <img
                      src={`/api/photos/${initialStartingItem.coverPhotoId}?variant=thumbnail`}
                      alt=""
                      className="size-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-lg bg-canvas text-teal/45">
                      <Shirt size={20} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-teal">
                      Starting with
                    </span>
                    <strong className="block truncate text-sm">
                      {itemLabel(initialStartingItem)}
                    </strong>
                    {initialStartingItem.category && (
                      <span className="block truncate text-xs text-ink/55">
                        {initialStartingItem.category}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeStartingConstraint}
                  >
                    <X size={14} aria-hidden="true" /> Remove
                  </Button>
                </div>
              </section>
            ) : (
              <p className="mt-5 text-sm leading-6 text-ink/60">
                Want to build around a particular piece?{" "}
                <Link
                  className="font-bold text-teal underline-offset-4 hover:underline"
                  href="/wardrobe"
                >
                  Open it from your wardrobe
                </Link>{" "}
                and choose “Build an outfit around this”.
              </p>
            )}
            <div className="mt-5 rounded-xl border border-teal/15 bg-mist/55 px-4 py-3 text-sm leading-6 text-ink/65">
              {hasStyleProfile ? (
                <>
                  <span>Your style notes will guide this suggestion. </span>
                  <Link
                    className="font-bold text-teal underline-offset-4 hover:underline"
                    href="/style"
                  >
                    Review your notes
                  </Link>
                  <span>.</span>
                </>
              ) : (
                <>
                  <span>Want suggestions that better reflect how you dress? </span>
                  <Link
                    className="font-bold text-teal underline-offset-4 hover:underline"
                    href="/style"
                  >
                    Add optional style notes
                  </Link>
                  <span>.</span>
                </>
              )}
            </div>
            <Button className="mt-6 w-full" type="submit" disabled={loading || !prompt.trim()}>
              {loading && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}
              {loading ? "Putting it together…" : "Suggest an outfit"}
            </Button>
          </form>

          <section
            className="rounded-3xl border border-line bg-mist/60 p-5 sm:p-8"
            aria-live="polite"
          >
            {result ? (
              <>
                <div className="font-mono text-xs font-bold tracking-[0.13em] text-berry">
                  FROM YOUR WARDROBE
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Your outfit</h2>
                {saved ? (
                  <OutfitGarments itemIds={result.referencedItemIds} items={items} />
                ) : (
                  <EditableOutfitGarments
                    itemIds={result.referencedItemIds}
                    items={items}
                    disabled={saving || ignoring}
                    onSwapRequest={(itemId) => {
                      setSwappingItemId(itemId);
                      setEditNotice("");
                    }}
                    onRemove={removeGarment}
                  />
                )}
                {!saved && swappingItemId && (
                  <GarmentSwapPanel
                    currentItemId={swappingItemId}
                    itemIds={result.referencedItemIds}
                    items={items}
                    disabled={saving || ignoring}
                    onCancel={() => setSwappingItemId(null)}
                    onSelect={swapGarment}
                  />
                )}
                <p className="sr-only" role="status" aria-live="polite">
                  {editNotice}
                </p>
                {saved ? (
                  <OutfitExplanation
                    recommendation={result.recommendation}
                    rationale={result.rationale}
                    referencedItemIds={result.referencedItemIds}
                  />
                ) : (
                  <EditableOutfitExplanation
                    recommendation={result.recommendation}
                    rationale={result.rationale}
                    referencedItemIds={result.referencedItemIds}
                    editing={editingRationale}
                    disabled={saving || ignoring}
                    onEditingChange={setEditingRationale}
                    onRecommendationChange={(recommendation) => {
                      setResult((current) => (current ? { ...current, recommendation } : current));
                      setEditNotice("");
                    }}
                    onRationaleChange={(rationale) => {
                      setResult((current) => (current ? { ...current, rationale } : current));
                      setEditNotice("");
                    }}
                  />
                )}
                <div className="mt-4 flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={save}
                    disabled={saving || ignoring || saved}
                  >
                    {saving ? (
                      <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Bookmark size={15} aria-hidden="true" />
                    )}
                    {saving ? "Saving…" : saved ? "Saved" : "Save outfit"}
                  </Button>
                  {!saved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={ignore}
                      disabled={saving || ignoring}
                    >
                      {ignoring ? (
                        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <EyeOff size={15} aria-hidden="true" />
                      )}
                      {ignoring ? "Ignoring…" : "Ignore outfit"}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-72 flex-col justify-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-teal">
                  Not sure where to start?
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">Try an example</h2>
                <p className="mt-2 max-w-md text-ink/65">
                  Pick a starting point, then change as much of it as you like.
                </p>
                <div className="mt-6 grid gap-2.5">
                  {promptExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setPrompt(example);
                        setPromptNotice("Example added to the outfit request.");
                        promptField.current?.focus();
                      }}
                      className="rounded-xl border border-line bg-canvas px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-teal hover:bg-citrus/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="mt-9 max-w-2xl rounded-3xl border border-dashed border-teal/40 bg-mist p-8 sm:p-10">
          <span className="inline-flex rounded-2xl bg-citrus p-3 text-berry">
            <Shirt size={24} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em]">Add a garment first</h2>
          <p className="mt-2 max-w-lg text-ink/65">
            Outfit Desk puts together a look from clothes currently in your wardrobe.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-berry px-5 py-3 text-sm font-bold text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:bg-berry-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          >
            Add a garment
          </Link>
        </section>
      )}

      <section className="mt-12" aria-labelledby="saved-outfits-heading">
        <div className="flex items-end justify-between gap-4 border-b-2 border-teal/20 pb-4">
          <div>
            <h2 id="saved-outfits-heading" className="text-3xl font-bold tracking-[-0.045em]">
              Saved outfits
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {savedOutfits.length} saved {savedOutfits.length === 1 ? "look" : "looks"}
            </p>
          </div>
        </div>
        {savedOutfits.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {savedOutfits.map((outfit) => (
              <article
                key={outfit.id}
                className="rounded-2xl border border-line bg-canvas p-5 shadow-[4px_4px_0_var(--color-peach)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-bold tracking-[-0.035em]">
                      {outfit.name}
                    </h3>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-ink/50">
                      Saved {formatSavedDate(outfit.createdAt)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-700 hover:bg-red-50 hover:text-red-700"
                    onClick={() => removeSaved(outfit.id)}
                    disabled={removingId === outfit.id}
                    aria-label={`Remove saved outfit ${outfit.name}`}
                  >
                    {removingId === outfit.id ? (
                      <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 size={14} aria-hidden="true" />
                    )}
                    Remove
                  </Button>
                </div>
                <OutfitGarments itemIds={outfit.referencedItemIds} items={catalogueItems} />
                <OutfitExplanation
                  recommendation={outfit.recommendation}
                  rationale={outfit.rationale}
                  referencedItemIds={outfit.referencedItemIds.filter((itemId) =>
                    catalogueItems.some((item) => item.id === itemId),
                  )}
                />
                {removeErrors[outfit.id] && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {removeErrors[outfit.id]}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 max-w-2xl rounded-2xl border border-dashed border-teal/35 bg-mist/60 p-6">
            <p className="text-sm leading-6 text-ink/65">
              Outfits you save will stay here so you can come back to them.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
