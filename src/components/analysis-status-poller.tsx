"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  analysisStatusSnapshot,
  reconcileTrackedAnalyses,
  type AnalysisStatusItem,
} from "@/features/wardrobe/domain/analysis-status";

type AnalysisStatusContextValue = { trackAnalysis: (itemId: string) => void };

const AnalysisStatusContext = createContext<AnalysisStatusContextValue | null>(null);

export function AnalysisStatusProvider({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const router = useRouter();
  const previousSnapshot = useRef<string | null>(null);
  const trackedItemIds = useRef(new Set<string>());
  const requestInFlight = useRef(false);
  const timeout = useRef<number | null>(null);
  const [wakeGeneration, setWakeGeneration] = useState(0);

  const trackAnalysis = useCallback(
    (itemId: string) => {
      if (!enabled) return;
      trackedItemIds.current.add(itemId);
      setWakeGeneration((generation) => generation + 1);
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    function schedule(delay: number) {
      if (cancelled) return;
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => void poll(), delay);
    }

    async function poll() {
      if (document.hidden) return;
      if (requestInFlight.current) {
        schedule(4000);
        return;
      }
      requestInFlight.current = true;
      try {
        const response = await fetch("/api/items/status", { cache: "no-store" });
        if (!response.ok) {
          schedule(15000);
          return;
        }
        const { items } = (await response.json()) as { items: AnalysisStatusItem[] };
        if (cancelled) return;
        const nextSnapshot = analysisStatusSnapshot(items);
        const reconciliation = reconcileTrackedAnalyses(trackedItemIds.current, items);
        trackedItemIds.current = reconciliation.trackedItemIds;
        if (
          reconciliation.completedItemIds.length > 0 ||
          (previousSnapshot.current !== null && previousSnapshot.current !== nextSnapshot)
        )
          router.refresh();
        previousSnapshot.current = nextSnapshot;
        schedule(items.length ? 4000 : 30000);
      } catch {
        schedule(15000);
      } finally {
        requestInFlight.current = false;
      }
    }

    void poll();
    const onVisibilityChange = () => {
      if (!document.hidden) {
        if (timeout.current !== null) window.clearTimeout(timeout.current);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, router, wakeGeneration]);

  return (
    <AnalysisStatusContext.Provider value={{ trackAnalysis }}>
      {children}
    </AnalysisStatusContext.Provider>
  );
}

export function useAnalysisStatus() {
  const context = useContext(AnalysisStatusContext);
  if (!context) throw new Error("useAnalysisStatus must be used inside AnalysisStatusProvider");
  return context;
}
