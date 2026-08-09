"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bookmark, LoaderCircle, Sparkles } from "lucide-react";

type Item = { id: string; name: string; category: string | null };
type Result = {
  id: string;
  recommendation: string;
  rationale: string;
  referencedItemIds: string[];
};

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
            <Link className="garment-link" href={`/items/${itemId}`}>
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
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, selectedItemId: selectedItemId || undefined }),
    });
    setLoading(false);
    if (response.ok) setResult(await response.json());
  }
  async function save() {
    if (!result) return;
    await fetch("/api/saved-outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: result.id, name: prompt.slice(0, 80) }),
    });
    setSaved(true);
  }
  return (
    <div className="outfit-layout">
      <form className="outfit-form" onSubmit={ask}>
        <label className="field-label">
          What are you dressing for?
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A relaxed dinner in London tonight…"
            rows={5}
            required
          />
        </label>
        <label className="field-label">
          Start with a particular garment <span>optional</span>
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
            <option value="">No preference</option>
            {items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
                {item.category ? ` · ${item.category}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-action" disabled={loading || !items.length}>
          {loading && <LoaderCircle className="spin" size={17} />}
          {loading ? "Thinking…" : "Suggest an outfit"}
        </button>
      </form>
      <section className="suggestion-panel">
        {result ? (
          <>
            <div className="suggestion-kicker">
              <Sparkles size={16} /> FROM YOUR WARDROBE
            </div>
            <div className="recommendation">
              <Recommendation
                content={result.recommendation}
                referencedItemIds={result.referencedItemIds}
              />
            </div>
            <p className="muted">{result.rationale}</p>
            <button className="text-button" onClick={save}>
              <Bookmark size={15} /> {saved ? "Saved" : "Save favourite"}
            </button>
          </>
        ) : (
          <>
            <span className="brand-mark">
              <Sparkles size={21} />
            </span>
            <h2>A considered answer, not another shopping list.</h2>
            <p>Give the occasion, mood, weather, or a garment to begin with.</p>
          </>
        )}
      </section>
    </div>
  );
}
