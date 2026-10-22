"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetEditor, usd } from "@/components/admin-budget-controls";
import { ManagedUserSettings, type ManagedUser } from "@/components/admin-user-manager";
import type { AccessMode } from "@/features/access/contracts";
import {
  directoryHref,
  memberBudgetState,
  type DirectoryQuery,
} from "@/features/access/application/member-directory";
import { createAiUsageHref } from "@/features/ai-usage/presentation/report-selection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type MemberDirectoryState = {
  query: DirectoryQuery;
  total: number;
  pageCount: number;
  matchedIds: string[];
};
const field = "rounded-lg border border-line bg-canvas px-3 py-2 text-sm focus:outline-teal";

export function MemberDirectory({
  users,
  accessMode,
  state,
}: {
  users: ManagedUser[];
  accessMode: AccessMode;
  state: MemberDirectoryState;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAccess, setBulkAccess] = useState("");
  const [bulkTier, setBulkTier] = useState("");
  const [saving, setSaving] = useState(false);
  const [openingReport, setOpeningReport] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Array<{ userId: string; error: string }>>([]);
  const [confirmation, setConfirmation] = useState<{
    userIds: string[];
    accessStatus: string;
    featureTier: string;
  } | null>(null);
  const pageSelected = users.length > 0 && users.every((user) => selected.includes(user.id));
  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  }
  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(
      new FormData(event.currentTarget) as unknown as Record<string, string>,
    );
    params.set("page", "1");
    router.push(`/admin/users?${params}`);
  }
  async function applyAccess(change: NonNullable<typeof confirmation>) {
    const ids = change.userIds;
    setSaving(true);
    setMessage("");
    setErrors([]);
    try {
      const response = await fetch("/api/admin/users/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ids,
          ...(change.accessStatus ? { accessStatus: change.accessStatus } : {}),
          ...(change.featureTier ? { featureTier: change.featureTier } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "Couldn’t update the selected members.");
        return;
      }
      const failures = payload.results.filter((result: { ok: boolean }) => !result.ok);
      setErrors(failures);
      setMessage(`${ids.length - failures.length} of ${ids.length} selected members updated.`);
      router.refresh();
    } catch {
      setMessage("Couldn’t update the selected members. Check your connection.");
    } finally {
      setSaving(false);
    }
  }
  async function viewSelectedUsage() {
    const ids = [...selected];
    setOpeningReport(true);
    setMessage("");
    try {
      router.push(await createAiUsageHref(30, ids));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn’t open this report.");
    } finally {
      setOpeningReport(false);
    }
  }
  return (
    <div>
      <form
        key={directoryHref(state.query)}
        onSubmit={search}
        className="flex flex-wrap items-end gap-3 border-b border-line p-4"
        aria-label="Find members"
      >
        <label className="min-w-48 flex-1 text-xs font-bold">
          Name or email
          <input
            name="q"
            type="search"
            defaultValue={state.query.q}
            className={`${field} mt-1 block w-full`}
          />
        </label>
        <label className="text-xs font-bold">
          Access
          <select name="access" defaultValue={state.query.access} className={`${field} mt-1 block`}>
            <option value="all">All access</option>
            <option value="pending">Pending</option>
            <option value="active">Effective active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          AI access
          <select name="ai" defaultValue={state.query.ai} className={`${field} mt-1 block`}>
            <option value="all">All AI access</option>
            <option value="ai">Enabled</option>
            <option value="inventory">Inventory only</option>
            <option value="requested">Requested AI</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Budget
          <select name="budget" defaultValue={state.query.budget} className={`${field} mt-1 block`}>
            <option value="all">All budgets</option>
            <option value="available">Available</option>
            <option value="reserved">Calls reserved</option>
            <option value="exhausted">Exhausted</option>
            <option value="override">Individual override</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Sort
          <select name="sort" defaultValue={state.query.sort} className={`${field} mt-1 block`}>
            <option value="name">Name</option>
            <option value="joined">Joined</option>
            <option value="spend">Monthly spend</option>
            <option value="remaining">Available budget</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Order
          <select
            name="direction"
            defaultValue={state.query.direction}
            className={`${field} mt-1 block`}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        <Button size="sm">Search / apply</Button>
      </form>
      <div className="space-y-3 border-b border-line bg-mist/50 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <strong aria-live="polite">{selected.length} selected</strong>
          <Button
            size="sm"
            variant="secondary"
            disabled={!users.length}
            onClick={() =>
              setSelected((ids) =>
                pageSelected
                  ? ids.filter((id) => !users.some((user) => user.id === id))
                  : [...new Set([...ids, ...users.map((user) => user.id)])],
              )
            }
          >
            {pageSelected ? "Deselect page" : `Select page (${users.length})`}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!state.total || state.total > 1000}
            onClick={() => setSelected([...state.matchedIds])}
          >
            Select all {state.total} results
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!selected.length}
            onClick={() => {
              setSelected([]);
              setErrors([]);
              setMessage("");
            }}
          >
            Clear selection
          </Button>
          {selected.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              disabled={openingReport}
              onClick={viewSelectedUsage}
            >
              {openingReport ? "Opening report…" : "View selected AI usage"}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink/65">
          Selection keeps the exact IDs you chose across pages and searches. “Select all results”
          replaces it with the current matching group. Maximum 1,000 targets per action.
        </p>
        {selected.length > 0 && (
          <div className="space-y-4 border-t border-teal/20 pt-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-bold">
                Selected account access
                <select
                  value={bulkAccess}
                  onChange={(event) => setBulkAccess(event.target.value)}
                  className={`${field} mt-1 block`}
                >
                  <option value="">Keep access</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Selected AI access
                <select
                  value={bulkTier}
                  onChange={(event) => setBulkTier(event.target.value)}
                  className={`${field} mt-1 block`}
                >
                  <option value="">Keep AI access</option>
                  <option value="ai">Enable AI</option>
                  <option value="inventory">Inventory only</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={saving || selected.length > 1000 || (!bulkAccess && !bulkTier)}
                onClick={() => {
                  setConfirmation({
                    userIds: [...selected],
                    accessStatus: bulkAccess,
                    featureTier: bulkTier,
                  });
                }}
              >
                {saving ? "Updating…" : `Update ${selected.length} selected`}
              </Button>
            </div>
            <BudgetEditor userIds={selected} />
          </div>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {errors.length > 0 && (
          <ul role="alert" className="space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <li className="break-all" key={error.userId}>
                {users.find((user) => user.id === error.userId)?.email ?? error.userId}:{" "}
                {error.error}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Members, effective access and current London calendar-month budget
          </caption>
          <thead className="border-b border-line bg-peach/25 font-mono text-[10px] uppercase">
            <tr>
              <th className="p-3">
                <span className="sr-only">Select</span>
              </th>
              <th className="p-3">Member</th>
              <th className="hidden p-3 sm:table-cell">Access / AI</th>
              <th className="hidden p-3 md:table-cell">Joined</th>
              <th className="hidden p-3 sm:table-cell">Month spend / limit</th>
              <th className="p-3">
                <span className="sr-only">Settings</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id} className={selected.includes(user.id) ? "bg-citrus/15" : ""}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="size-5 accent-berry"
                    aria-label={`Select ${user.email}`}
                    checked={selected.includes(user.id)}
                    onChange={() => toggle(user.id)}
                  />
                </td>
                <td className="min-w-44 max-w-72 p-3">
                  <strong className="block break-words">{user.name ?? "Unnamed member"}</strong>
                  <span className="block break-all text-xs text-ink/65">{user.email}</span>
                  {user.isAdmin && (
                    <span className="font-mono text-[10px] text-teal-dark">Admin</span>
                  )}
                  {user.hasPendingAiRequest && (
                    <span className="block text-xs font-bold text-berry">AI access requested</span>
                  )}
                  <span className="mt-1 block text-xs sm:hidden">
                    {user.effectiveAccessStatus} ·{" "}
                    {user.isAdmin || user.featureTier === "ai" ? "AI enabled" : "Inventory only"}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] sm:hidden">
                    Month {usd(user.budget.spentMicrousd)} / {usd(user.budget.limitMicrousd)} ·{" "}
                    {memberBudgetState(user.budget)}
                  </span>
                </td>
                <td className="hidden p-3 sm:table-cell">
                  <span className="block capitalize">{user.effectiveAccessStatus}</span>
                  <span className="block text-xs text-ink/65">
                    {user.isAdmin || user.featureTier === "ai" ? "AI enabled" : "Inventory only"}
                  </span>
                  {user.accessStatus !== user.effectiveAccessStatus && (
                    <span className="block text-xs text-ink/65">Stored: {user.accessStatus}</span>
                  )}
                </td>
                <td className="hidden whitespace-nowrap p-3 text-xs md:table-cell">
                  {user.joinedLabel}
                </td>
                <td className="hidden p-3 sm:table-cell">
                  <span className="whitespace-nowrap font-mono text-xs">
                    {usd(user.budget.spentMicrousd)} / {usd(user.budget.limitMicrousd)}
                  </span>
                  <span
                    className={`block text-xs ${memberBudgetState(user.budget) === "exhausted" ? "font-bold text-berry" : "text-ink/65"}`}
                  >
                    {memberBudgetState(user.budget) === "exhausted"
                      ? "Budget exhausted"
                      : user.budget.reservedMicrousd > 0
                        ? `${usd(user.budget.reservedMicrousd)} reserved`
                        : `${usd(user.budget.availableMicrousd)} available`}
                  </span>
                </td>
                <td className="p-3">
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Settings for ${user.email}`}
                      >
                        Settings
                      </Button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45" />
                      <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-line bg-canvas shadow-xl outline-none">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-canvas p-5">
                          <div className="min-w-0">
                            <Dialog.Title className="break-words text-xl font-bold">
                              {user.name ?? "Member settings"}
                            </Dialog.Title>
                            <Dialog.Description className="break-all text-sm text-ink/65">
                              {user.email}
                            </Dialog.Description>
                          </div>
                          <Dialog.Close asChild>
                            <Button size="sm" variant="ghost" aria-label="Close member settings">
                              <X size={20} />
                            </Button>
                          </Dialog.Close>
                        </div>
                        <ManagedUserSettings
                          key={`${user.id}:${user.accessStatus}:${user.featureTier}`}
                          user={user}
                          accessMode={accessMode}
                        />
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <p className="p-6 text-sm text-ink/65">No members match these filters.</p>
      )}
      <nav
        aria-label="Member pages"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"
      >
        <span>
          {state.total} matching members · Page {state.query.page} of {state.pageCount}
        </span>
        <div className="flex gap-4">
          {state.query.page > 1 && (
            <Link
              className="font-bold text-berry underline"
              href={directoryHref(state.query, state.query.page - 1)}
            >
              Previous page
            </Link>
          )}
          {state.query.page < state.pageCount && (
            <Link
              className="font-bold text-berry underline"
              href={directoryHref(state.query, state.query.page + 1)}
            >
              Next page
            </Link>
          )}
        </div>
      </nav>
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Update {confirmation?.userIds.length ?? 0} selected members?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-3">
            Account access: {confirmation?.accessStatus || "keep current"}. AI access:{" "}
            {confirmation?.featureTier || "keep current"}. Administrator downgrades will be rejected
            and reported individually.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  const ids = confirmation;
                  setConfirmation(null);
                  if (ids) void applyAccess(ids);
                }}
              >
                Confirm changes
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
