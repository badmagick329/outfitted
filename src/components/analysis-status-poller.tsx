"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type StatusItem = { id: string; status: string; updatedAt: string };

function snapshot(items: StatusItem[]) {
  return items
    .map((item) => `${item.id}:${item.status}:${item.updatedAt}`)
    .sort()
    .join("|");
}

export function AnalysisStatusPoller() {
  const router = useRouter();
  const previousSnapshot = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
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
        const { items } = (await response.json()) as { items: StatusItem[] };
        const nextSnapshot = snapshot(items);
        if (previousSnapshot.current !== null && previousSnapshot.current !== nextSnapshot)
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
  }, [router]);

  return null;
}
