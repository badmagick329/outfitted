"use client";

import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

/*
 * Playback plumbing shared by the landing-page demos. Both stores report their server value during
 * hydration, so the first client render matches the server markup before the real value applies.
 */

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

export function usePageVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
}

// Hidden under reduced motion, where demos show a still and there is nothing to pause.
export function DemoPauseButton({
  paused,
  onToggle,
  label,
  className = "",
}: {
  paused: boolean;
  onToggle: () => void;
  /** Names the demo for screen readers, since several pause buttons share the page. */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${paused ? "Play" : "Pause"} ${label}`}
      className={`z-40 inline-flex -rotate-2 items-center gap-1.5 rounded-full border-2 border-ink bg-teal px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-canvas shadow-[3px_3px_0_var(--color-citrus)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry motion-reduce:hidden ${className}`}
    >
      {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
      {paused ? "Play" : "Pause"}
    </button>
  );
}
