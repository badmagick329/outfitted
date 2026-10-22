import { describe, expect, it } from "vitest";
import {
  directoryQuerySchema,
  queryMemberDirectory,
  type DirectoryEntry,
} from "./member-directory";

const members: DirectoryEntry[] = Array.from({ length: 137 }, (_, index) => ({
  id: `member-${String(index).padStart(3, "0")}`,
  name: `Member ${String(index).padStart(3, "0")}`,
  email: `member.${index}@example.com`,
  createdAt: new Date(2026, 0, index + 1),
  effectiveAccessStatus: index % 3 === 0 ? "pending" : "active",
  featureTier: index % 2 ? "ai" : "inventory",
  isAdmin: false,
  hasPendingAiRequest: index % 11 === 0,
  budget: {
    spentMicrousd: index * 100000,
    reservedMicrousd: index % 7 === 0 ? 200000 : 0,
    availableMicrousd: Math.max(0, 5000000 - index * 100000),
    limitMicrousd: 5000000,
    overrideLimitMicrousd: index % 5 === 0 ? 5000000 : null,
  },
}));

describe("member directory", () => {
  it("searches the entire directory and paginates every match stably", () => {
    const query = directoryQuerySchema.parse({});
    const all = Array.from(
      { length: 6 },
      (_, index) => queryMemberDirectory(members, { ...query, page: index + 1 }).rows,
    ).flat();
    expect(all.map((member) => member.id)).toEqual(members.map((member) => member.id));
    expect(
      queryMemberDirectory(members, { ...query, q: "MEMBER.136@" }).rows.map((member) => member.id),
    ).toEqual(["member-136"]);
    expect(queryMemberDirectory(members, { ...query, q: "Member 099" }).total).toBe(1);
  });

  it("filters before counts/target capture and sorts with an ID tiebreaker", () => {
    const query = directoryQuerySchema.parse({
      ai: "ai",
      access: "active",
      budget: "override",
      sort: "spend",
      direction: "desc",
    });
    const result = queryMemberDirectory(members, query);
    expect(result.total).toBeGreaterThan(0);
    expect(result.matchedIds).toEqual(
      members
        .filter(
          (m) =>
            m.featureTier === "ai" &&
            m.effectiveAccessStatus === "active" &&
            m.budget.overrideLimitMicrousd !== null,
        )
        .reverse()
        .map((m) => m.id),
    );
    const captured = [...result.matchedIds];
    queryMemberDirectory(members, { ...query, q: "not-found" });
    expect(result.matchedIds).toEqual(captured);
  });

  it("distinguishes exhausted budgets, live reservations and effective admin AI", () => {
    const query = directoryQuerySchema.parse({ budget: "reserved" });
    expect(
      queryMemberDirectory(members, query).rows.every(
        (m) => m.budget.spentMicrousd < m.budget.limitMicrousd && m.budget.reservedMicrousd > 0,
      ),
    ).toBe(true);
    const admin = { ...members[0], isAdmin: true };
    expect(queryMemberDirectory([admin], { ...query, budget: "all", ai: "ai" }).total).toBe(1);
  });
});
