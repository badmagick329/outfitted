"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  commitTokenDraft,
  removeToken,
  tokenFieldPresentation,
} from "@/features/wardrobe/domain/token-field";

const inputClassName =
  "min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink/35";

export function MetadataTokenField({
  label,
  placeholder,
  hint,
  values,
  draft,
  suggestions = [],
  collapsible = false,
  addActionLabel = "Add another",
  onValuesChange,
  onDraftChange,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  values: string[];
  draft: string;
  suggestions?: string[];
  collapsible?: boolean;
  addActionLabel?: string;
  onValuesChange: (values: string[]) => void;
  onDraftChange: (draft: string) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const listId = useId();
  const composing = useRef(false);
  const [inputOpen, setInputOpen] = useState(false);
  const presentation = collapsible ? tokenFieldPresentation(values, draft, inputOpen) : "editing";

  function commit(value = draft) {
    if (!value.trim()) return;
    const next = commitTokenDraft(values, value, suggestions);
    if (next.length !== values.length || next.some((token, index) => token !== values[index]))
      onValuesChange(next);
    onDraftChange("");
  }

  return (
    <div>
      {presentation !== "compact" && (
        <label htmlFor={inputId} className="block text-sm font-bold text-ink">
          {label}
        </label>
      )}
      {presentation === "compact" ? (
        <button
          type="button"
          className="text-sm font-bold text-teal hover:text-teal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          onClick={() => setInputOpen(true)}
        >
          {addActionLabel}
        </button>
      ) : (
        <div className="mt-1.5 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-canvas px-2 py-1.5 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/15">
          {values.map((value) => (
            <span
              key={value.toLocaleLowerCase()}
              className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-1 text-xs font-bold text-teal-dark"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                className="rounded-full p-0.5 hover:bg-teal/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-berry"
                onClick={() => {
                  const next = removeToken(values, value);
                  onValuesChange(next);
                  if (collapsible && !next.length && !draft.trim()) setInputOpen(false);
                }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          {presentation === "editing" && (
            <input
              id={inputId}
              className={inputClassName}
              value={draft}
              placeholder={placeholder}
              list={suggestions.length ? listId : undefined}
              aria-describedby={hint ? hintId : undefined}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (composing.current) return;
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  commit();
                }
                if (event.key === "Backspace" && !draft && values.length) {
                  event.preventDefault();
                  onValuesChange(values.slice(0, -1));
                }
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted.includes(",")) return;
                event.preventDefault();
                const next = commitTokenDraft(values, pasted, suggestions);
                if (
                  next.length !== values.length ||
                  next.some((token, index) => token !== values[index])
                )
                  onValuesChange(next);
                onDraftChange("");
              }}
              onBlur={() => {
                if (!composing.current) commit();
              }}
            />
          )}
        </div>
      )}
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion.toLocaleLowerCase()} value={suggestion} />
          ))}
        </datalist>
      )}
      {hint && presentation === "editing" && (
        <span id={hintId} className="mt-1 block text-xs text-ink/50">
          {hint}
        </span>
      )}
      {collapsible && presentation === "chips" && (
        <button
          type="button"
          className="mt-2 text-sm font-bold text-teal hover:text-teal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          onClick={() => setInputOpen(true)}
        >
          {addActionLabel}
        </button>
      )}
      {collapsible && presentation === "editing" && !draft.trim() && (
        <button
          type="button"
          className="mt-2 text-xs font-bold text-ink/55 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
          onClick={() => setInputOpen(false)}
        >
          Done adding colours
        </button>
      )}
    </div>
  );
}
