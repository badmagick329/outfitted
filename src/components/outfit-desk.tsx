/* eslint-disable @next/next/no-img-element -- authenticated private image routes cannot use Next's default image loader. */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Bookmark, LoaderCircle, Shirt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function Recommendation({
  content,
  referencedItemIds,
}: {
  content: string;
  referencedItemIds: string[];
}) {
  const allowedItemIds = new Set(referencedItemIds);
  return (
    <ReactMarkdown
      skipHtml
      allowedElements={["p", "ul", "ol", "li", "strong", "em", "h3", "h4", "a", "br", "code"]}
      components={{
        a({ href, children }) {
          const itemId = href?.startsWith("item:") ? href.slice(5) : "";
          return allowedItemIds.has(itemId) ? (
            <Link
              className="font-bold text-berry underline decoration-citrus decoration-2 underline-offset-4 hover:text-teal"
              href={`/items/${itemId}`}
            >
              {children}
            </Link>
          ) : (
            <>{children}</>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function OutfitGarments({ itemIds, items }: { itemIds: string[]; items: Item[] }) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const outfitItems = itemIds.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });

  if (!outfitItems.length) return null;

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {outfitItems.map((item) => {
        const accessibleName = item.name || item.category || "garment";
        const hasVisibleDetails = Boolean(item.name || item.category);
        return (
          <Link
            href={`/items/${item.id}`}
            key={item.id}
            aria-label={`Open ${accessibleName}`}
            className="group overflow-hidden rounded-xl border border-line bg-canvas transition hover:-translate-y-0.5 hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          >
            {item.coverPhotoId ? (
              <img
                src={`/api/photos/${item.coverPhotoId}`}
                alt={item.name || item.category || "Garment in this outfit"}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full bg-mist object-cover transition duration-300 group-hover:scale-[1.02]"
              />
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
          </Link>
        );
      })}
    </div>
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
  initialSavedOutfits,
}: {
  items: Item[];
  catalogueItems: Item[];
  initialSavedOutfits: SavedOutfit[];
}) {
  const promptField = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [promptNotice, setPromptNotice] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [savedOutfits, setSavedOutfits] = useState(initialSavedOutfits);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, selectedItemId: selectedItemId || undefined }),
      });
      if (!response.ok) {
        setError(await messageFrom(response, "Couldn’t create an outfit."));
        return;
      }
      const payload = (await response.json()) as Result;
      setResult(payload);
      setSaved(savedOutfits.some((outfit) => outfit.suggestionId === payload.id));
    } catch {
      setError("Couldn’t create an outfit. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || saved || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/saved-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: result.id, name: prompt.slice(0, 80) }),
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
          name: prompt.slice(0, 80),
          createdAt: payload.createdAt,
          recommendation: result.recommendation,
          rationale: result.rationale,
          referencedItemIds: result.referencedItemIds,
        },
        ...current.filter((outfit) => outfit.suggestionId !== result.id),
      ]);
      setSaved(true);
    } catch {
      setError("Couldn’t save this outfit. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
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
            <p className="sr-only" role="status" aria-live="polite">
              {promptNotice}
            </p>
            <label className="mt-5 block text-sm font-bold">
              Start with a particular garment{" "}
              <span className="font-normal text-ink/55">optional</span>
              <select
                className={fieldClassName}
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
              >
                <option value="">No preference</option>
                {items.map((item, index) => (
                  <option value={item.id} key={item.id}>
                    {item.name || item.category || `Garment ${index + 1}`}
                    {item.name && item.category ? ` · ${item.category}` : ""}
                  </option>
                ))}
              </select>
            </label>
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
                <OutfitGarments itemIds={result.referencedItemIds} items={items} />
                <OutfitExplanation
                  recommendation={result.recommendation}
                  rationale={result.rationale}
                  referencedItemIds={result.referencedItemIds}
                />
                <Button
                  className="mt-4"
                  variant="ghost"
                  size="sm"
                  onClick={save}
                  disabled={saving || saved}
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Bookmark size={15} aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : saved ? "Saved" : "Save outfit"}
                </Button>
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
