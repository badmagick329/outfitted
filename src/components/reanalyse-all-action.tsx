"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ReanalyseAllAction({
  activeCount,
  eligibleCount,
}: {
  activeCount: number;
  eligibleCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function reanalyse() {
    if (submitting || eligibleCount === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/wardrobe/reanalyse-all", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Couldn’t queue wardrobe re-analysis.");
        return;
      }
      setNotice(payload?.message ?? "Garments queued for re-analysis.");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn’t queue wardrobe re-analysis. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="secondary" disabled={eligibleCount === 0}>
            <RefreshCw size={16} aria-hidden="true" /> Re-analyse all
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Re-analyse {eligibleCount} active {eligibleCount === 1 ? "garment" : "garments"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archived garments will not be included. Current generated and manually edited garment
              details will be replaced. This uses AI requests and may take time, but you can
              continue using the app while processing happens.
              {activeCount > eligibleCount
                ? ` ${activeCount - eligibleCount} ${activeCount - eligibleCount === 1 ? "garment is" : "garments are"} already waiting or processing and will be skipped.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary" disabled={submitting}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" onClick={reanalyse} disabled={submitting}>
                {submitting && (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                )}
                {submitting ? "Queuing…" : "Re-analyse garments"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {eligibleCount === 0 && (
        <span className="text-xs text-ink/55">All active garments are already being analysed.</span>
      )}
      {(error || notice) && (
        <span
          role={error ? "alert" : "status"}
          className={error ? "text-xs text-red-700" : "text-xs text-teal-dark"}
        >
          {error || notice}
        </span>
      )}
    </div>
  );
}
