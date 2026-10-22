"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AiBudgetSnapshot } from "@/features/ai-budget/domain/contracts";

export const usd = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value / 1_000_000);
export const londonReset = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
    hourCycle: "h23",
  }).format(value);

export function BudgetStatus({ budget }: { budget: AiBudgetSnapshot }) {
  return (
    <div className="space-y-2 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt>Monthly limit</dt>
        <dd className="text-right font-mono">{usd(budget.limitMicrousd)}</dd>
        <dt>Spent</dt>
        <dd className="text-right font-mono">{usd(budget.spentMicrousd)}</dd>
        <dt>Reserved by running calls</dt>
        <dd className="text-right font-mono">{usd(budget.reservedMicrousd)}</dd>
        <dt>Available</dt>
        <dd className="text-right font-mono">{usd(budget.availableMicrousd)}</dd>
      </dl>
      <p className="text-xs text-ink/65">
        Resets {londonReset(budget.period.endsAt)} Europe/London.{" "}
        {budget.overrideLimitMicrousd === null
          ? "Uses the shared default."
          : "Individual override persists until restored to default."}
      </p>
      {budget.spentMicrousd >= budget.limitMicrousd && (
        <p className="rounded-lg border border-berry/30 bg-peach p-3">
          Existing spend exhausts this limit. Further AI calls are blocked until the limit rises or
          the month resets.
        </p>
      )}
      {budget.reservedMicrousd > 0 && (
        <p className="rounded-lg border border-teal/25 bg-mist p-3">
          Running or unconfirmed provider calls hold {usd(budget.reservedMicrousd)}. Their unused
          allowance returns after confirmed settlement.
        </p>
      )}
    </div>
  );
}

export function BudgetEditor({
  defaultLimit,
  budget,
  userIds,
}: {
  defaultLimit?: number;
  budget?: AiBudgetSnapshot;
  userIds?: string[];
}) {
  const router = useRouter();
  const isDefault = defaultLimit !== undefined;
  const targets = budget ? [budget.userId] : (userIds ?? []);
  const [amount, setAmount] = useState(
    String((defaultLimit ?? budget?.limitMicrousd ?? 5_000_000) / 1_000_000),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<Array<{ userId: string; error: string }>>([]);
  async function save(restore = false) {
    const numeric = Number(amount);
    if (
      !restore &&
      (!amount.trim() ||
        !/^\d+(?:\.\d{1,6})?$/.test(amount) ||
        !Number.isFinite(numeric) ||
        numeric < 0 ||
        numeric > 2147.483647)
    ) {
      setError("Enter a USD amount from 0 to 2147.483647, with at most six decimal places.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    setFailures([]);
    try {
      const response = await fetch("/api/admin/ai-budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isDefault
            ? { action: "default", amountMicrousd: Math.round(numeric * 1_000_000) }
            : {
                action: "override",
                userIds: targets,
                amountMicrousd: restore ? null : Math.round(numeric * 1_000_000),
              },
        ),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Couldn’t save the budget.");
        return;
      }
      const failed = (payload.results ?? []).filter((result: { ok: boolean }) => !result.ok);
      setFailures(failed);
      setNotice(
        isDefault
          ? "Default saved. Inherited budgets now use this amount."
          : `${targets.length - failed.length} of ${targets.length} member budgets ${restore ? "restored to default" : "saved"}.`,
      );
      router.refresh();
    } catch {
      setError("Couldn’t save the budget. Check your connection.");
    } finally {
      setSaving(false);
    }
  }
  const targetCount = isDefault ? null : targets.length;
  return (
    <section
      className="space-y-3"
      aria-label={isDefault ? "Default monthly AI budget" : "Member monthly AI budget"}
    >
      {budget && <BudgetStatus budget={budget} />}
      {isDefault && (
        <p className="text-sm text-ink/65">
          Applies to existing and new members without an individual override, including admins. Each
          member keeps their own allowance.
        </p>
      )}
      {targetCount !== null && !budget && (
        <p className="text-sm font-bold">
          Budget action targets exactly {targetCount} selected members.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="text-sm font-bold">
          {isDefault ? "Default monthly budget (USD)" : "Individual monthly budget (USD)"}
          <input
            className="mt-1 block w-44 rounded-lg border border-line bg-canvas px-3 py-2 font-mono focus:outline-teal"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <Button size="sm" disabled={saving || (!isDefault && !targets.length)}>
          {saving ? "Saving…" : isDefault ? "Save default" : "Set override"}
        </Button>
        {!isDefault && (
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={saving || !targets.length}
            onClick={() => save(true)}
          >
            Restore default
          </Button>
        )}
      </form>
      <p className="text-xs text-ink/65">
        Changing a limit preserves spend. A limit below current spend blocks further AI work
        immediately.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-teal-dark">
          {notice}
        </p>
      )}
      {failures.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-red-700">
          {failures.map((failure) => (
            <li className="break-all" key={failure.userId}>
              {failure.userId}: {failure.error}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
