import { normalizeMetadataList } from "./metadata";

export function commitTokenDraft(values: string[], draft: string, established: string[] = []) {
  return normalizeMetadataList([...values, ...draft.split(",")], established);
}

export function removeToken(values: string[], value: string) {
  const key = value.trim().toLocaleLowerCase();
  return values.filter((entry) => entry.trim().toLocaleLowerCase() !== key);
}

export function tokenFieldIsDirty(values: string[], savedValues: string[], draft: string) {
  return JSON.stringify(values) !== JSON.stringify(savedValues) || Boolean(draft.trim());
}

export function tokenFieldPresentation(values: string[], draft: string, inputOpen: boolean) {
  if (inputOpen || draft.trim()) return "editing";
  return values.length ? "chips" : "compact";
}
