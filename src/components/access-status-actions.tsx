"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export function AccessStatusActions({ checkAutomatically }: { checkAutomatically: boolean }) {
  const router = useRouter();
  const [checking, startChecking] = useTransition();
  const [notice, setNotice] = useState("");

  function check() {
    setNotice("");
    startChecking(() => {
      router.refresh();
      setNotice("Status checked.");
    });
  }

  useEffect(() => {
    if (!checkAutomatically) return;
    const interval = window.setInterval(() => {
      startChecking(() => router.refresh());
    }, 30000);
    return () => window.clearInterval(interval);
  }, [checkAutomatically, router]);

  return (
    <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <Button type="button" variant="secondary" onClick={check} disabled={checking}>
        {checking ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={16} aria-hidden="true" />
        )}
        {checking ? "Checking…" : "Check again"}
      </Button>
      <SignOutButton />
      <span className="sr-only" role="status" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
