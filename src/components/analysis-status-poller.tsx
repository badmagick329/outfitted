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

  useEffect(() => {
    async function poll() {
      if (document.hidden || requestInFlight.current) return;
      requestInFlight.current = true;
      try {
        const response = await fetch("/api/items/status", { cache: "no-store" });
        if (!response.ok) return;
        const { items } = (await response.json()) as { items: StatusItem[] };
        const nextSnapshot = snapshot(items);
        if (previousSnapshot.current !== null && previousSnapshot.current !== nextSnapshot)
          router.refresh();
        previousSnapshot.current = nextSnapshot;
      } catch {
        // Status refresh is best-effort; the next scheduled check retries it.
      } finally {
        requestInFlight.current = false;
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), 4000);
    const onVisibilityChange = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
