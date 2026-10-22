import { afterEach, describe, expect, it, vi } from "vitest";
import { createAiUsageHref } from "./report-selection";
const token = "dfb80000-0000-4000-8000-000000000001";
const memberIds = Array.from(
  { length: 1000 },
  (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
);
afterEach(() => vi.unstubAllGlobals());
describe("report selection client handoff", () => {
  it("keeps groups of up to100 in repeated canonical query parameters without I/O", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const url = await createAiUsageHref(7, memberIds.slice(0, 100));
    expect(new URL(url, "http://localhost").searchParams.getAll("memberId")).toEqual(
      memberIds.slice(0, 100),
    );
    expect(await createAiUsageHref(30, null)).toBe("/admin/ai-usage?range=30");
    expect(await createAiUsageHref(30, [])).toBe("/admin/ai-usage?range=30&memberId=");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("saves all1000 UUID targets and returns a compact token URL", async () => {
    const fetch = vi.fn(async () => Response.json({ selectionId: token }, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const url = await createAiUsageHref(90, [...memberIds].reverse());
    expect(url).toBe(`/admin/ai-usage?range=90&selection=${token}`);
    expect(url.length).toBeLessThan(100);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/admin/ai-usage/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });
  });
  it("retains the current view when saving fails or an external token response is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { message: "Unavailable member" } }, { status: 400 }),
      ),
    );
    await expect(createAiUsageHref(30, memberIds)).rejects.toThrow("Unavailable member");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ selectionId: "not-a-uuid" }, { status: 201 })),
    );
    await expect(createAiUsageHref(30, memberIds)).rejects.toThrow();
  });
});
