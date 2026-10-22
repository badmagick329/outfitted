"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import {
  type AiUsageSelection,
  type ReportMember,
} from "@/features/ai-usage/application/report-selection";
import { createAiUsageHref } from "@/features/ai-usage/presentation/report-selection";

export function AiUsageMemberSelect({
  range,
  selectedMemberIds,
  members,
}: {
  range: number;
  selectedMemberIds: AiUsageSelection;
  members: ReportMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<AiUsageSelection>(selectedMemberIds);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const visibleMembers = members.filter((member) =>
    `${member.name ?? ""} ${member.email}`.toLowerCase().includes(search.toLowerCase().trim()),
  );

  async function applySelection() {
    setCreating(true);
    setError("");
    try {
      const href = await createAiUsageHref(range, draft);
      startTransition(() => {
        router.push(href, { scroll: false });
        setOpen(false);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save the member selection.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (creating || pending) return;
        if (nextOpen) {
          setDraft(selectedMemberIds);
          setSearch("");
          setError("");
        }
        setOpen(nextOpen);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-line bg-canvas px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
        >
          {selectedMemberIds === null
            ? "All members"
            : `${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "member" : "members"} selected`}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label="Select report members"
          className="z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-canvas p-4 shadow-[5px_5px_0_var(--color-mist)]"
        >
          <h3 className="text-lg font-bold">Report members</h3>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={creating || pending}
              onClick={() => setDraft(null)}
              aria-pressed={draft === null}
              className="min-h-11 font-bold text-berry underline underline-offset-4"
            >
              All members
            </button>
            <button
              type="button"
              disabled={creating || pending}
              onClick={() => setDraft([])}
              className="min-h-11 text-ink/65 underline underline-offset-4"
            >
              Clear selection
            </button>
          </div>
          <label className="mt-2 block text-xs font-bold" htmlFor="report-member-search">
            Find a member
          </label>
          <input
            id="report-member-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            className="mt-2 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          <p className="my-3 text-xs text-ink/60" aria-live="polite">
            {draft === null ? `All ${members.length} members` : `${draft.length} selected`} ·{" "}
            {visibleMembers.length} found
          </p>
          <fieldset
            disabled={creating || pending}
            className="max-h-64 overflow-y-auto border-y border-line"
          >
            <legend className="sr-only">Members included in this report</legend>
            {visibleMembers.map((member) => (
              <label
                key={member.id}
                className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-line/50 py-2 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={draft === null || draft.includes(member.id)}
                  onChange={(event) => {
                    const current = draft === null ? members.map((entry) => entry.id) : [...draft];
                    setDraft(
                      event.target.checked
                        ? [...current, member.id]
                        : current.filter((id) => id !== member.id),
                    );
                  }}
                  className="size-4 shrink-0 accent-berry"
                />
                <span className="min-w-0">
                  <strong className="block break-words text-sm">
                    {member.name ?? "Unnamed member"}
                  </strong>
                  <span className="block break-all text-xs text-ink/60">{member.email}</span>
                </span>
              </label>
            ))}
            {!visibleMembers.length && (
              <p className="py-5 text-sm text-ink/60">No members match this search.</p>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="mt-3 text-sm text-berry">
              {error}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Popover.Close
              disabled={creating || pending}
              className="min-h-11 px-3 text-sm font-bold"
            >
              Cancel
            </Popover.Close>
            <button
              type="button"
              disabled={creating || pending}
              onClick={applySelection}
              className="min-h-11 rounded-xl bg-berry px-4 text-sm font-bold text-canvas disabled:opacity-50"
            >
              {creating ? "Saving selection…" : pending ? "Loading…" : "Apply selection"}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
