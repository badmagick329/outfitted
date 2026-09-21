"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type RequestStatus = "pending" | "declined" | null;

export function AiAccessRequestPanel({ status: initialStatus }: { status: RequestStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function request() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/ai-access/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.status === 409) {
        setStatus("pending");
        router.refresh();
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Couldn’t send your request.");
        return;
      }
      setStatus("pending");
      router.refresh();
    } catch {
      setError("Couldn’t send your request. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "pending") {
    return (
      <div
        role="status"
        className="rounded-3xl border border-teal/25 bg-mist p-6 shadow-[5px_5px_0_var(--color-peach)] sm:p-8"
      >
        <span className="inline-flex rounded-2xl bg-teal p-3 text-canvas">
          <Clock3 size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em]">Request pending</h2>
        <p className="mt-2 max-w-xl text-ink/65">
          An administrator will review your request. You’ll get access to AI features as soon as it
          is approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status === "declined" && (
        <p className="rounded-2xl border border-line bg-canvas/70 px-4 py-3 text-sm text-ink/70">
          Your last request wasn’t approved. You can ask again whenever you’re ready.
        </p>
      )}
      <Button type="button" size="lg" onClick={request} disabled={submitting}>
        {submitting && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
        {submitting ? "Sending…" : "Request AI access"}
      </Button>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
