"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bookmark, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { id: string; name: string; category: string | null };
type Result = {
  id: string;
  recommendation: string;
  rationale: string;
  referencedItemIds: string[];
};
const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15";

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

export function OutfitDesk({ items }: { items: Item[] }) {
  const [prompt, setPrompt] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
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
      const payload = await response.json();
      if (!response.ok) return setError(payload.error?.message ?? "Couldn’t create a suggestion.");
      setResult(payload);
    } catch {
      setError("Couldn’t create a suggestion. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }
  async function save() {
    if (!result) return;
    const response = await fetch("/api/saved-outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: result.id, name: prompt.slice(0, 80) }),
    });
    if (response.ok) setSaved(true);
    else setError("Couldn’t save this outfit.");
  }
  return (
    <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(19rem,0.7fr)_minmax(0,1fr)]">
      <form
        className="rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-mist)] sm:p-7"
        onSubmit={ask}
      >
        <label className="block text-sm font-bold">
          What are you dressing for?
          <textarea
            className={fieldClassName}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A relaxed dinner in London tonight…"
            rows={5}
            required
          />
        </label>
        <label className="mt-5 block text-sm font-bold">
          Start with a particular garment <span className="font-normal text-ink/55">optional</span>
          <select
            className={fieldClassName}
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
          >
            <option value="">No preference</option>
            {items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
                {item.category ? ` · ${item.category}` : ""}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <Button className="mt-6 w-full" type="submit" disabled={loading || !items.length}>
          {loading && <LoaderCircle className="animate-spin" size={17} />}
          {loading ? "Thinking…" : "Suggest an outfit"}
        </Button>
      </form>
      <section className="rounded-3xl border border-line bg-mist/60 p-5 sm:p-8">
        {result ? (
          <>
            <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.13em] text-berry">
              <Sparkles size={16} /> FROM YOUR WARDROBE
            </div>
            <div className="prose prose-sm mt-6 max-w-none text-ink prose-headings:font-display prose-p:leading-7 prose-li:my-2">
              <Recommendation
                content={result.recommendation}
                referencedItemIds={result.referencedItemIds}
              />
            </div>
            <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-ink/65">
              {result.rationale}
            </p>
            <Button className="mt-4" variant="ghost" size="sm" onClick={save}>
              <Bookmark size={15} /> {saved ? "Saved" : "Save favourite"}
            </Button>
          </>
        ) : (
          <div className="flex min-h-72 flex-col justify-center">
            <span className="w-fit rounded-2xl bg-citrus p-3 text-berry">
              <Sparkles size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em]">
              A considered answer, not another shopping list.
            </h2>
            <p className="mt-2 max-w-md text-ink/65">
              Give the occasion, mood, weather, or a garment to begin with.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
