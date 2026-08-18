import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  desc: vi.fn((value) => value),
  eq: vi.fn((left, right) => ({ left, right })),
}));

vi.mock("@/lib/db", () => ({ db: queryMocks.db }));
vi.mock("@/lib/db/schema", () => ({
  ignoredOutfits: {},
  outfitSuggestions: {
    selectedItemIds: "selected_item_ids",
    userId: "user_id",
    createdAt: "created_at",
  },
  savedOutfits: {},
  wardrobeItems: {},
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: queryMocks.desc,
  eq: queryMocks.eq,
  isNull: vi.fn(),
}));

import { DrizzleOutfitRepository } from "./drizzle-outfit-repository";

describe("DrizzleOutfitRepository.listRecentSuggestionItemIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the requested newest suggestion item sets", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue([
        { selectedItemIds: ["newest-item"] },
        { selectedItemIds: ["older-item", "another-item"] },
      ]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    queryMocks.db.select.mockReturnValue({ from });

    await expect(
      new DrizzleOutfitRepository().listRecentSuggestionItemIds("user-1", 2),
    ).resolves.toEqual([["newest-item"], ["older-item", "another-item"]]);

    expect(queryMocks.db.select).toHaveBeenCalledWith({ selectedItemIds: "selected_item_ids" });
    expect(queryMocks.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(queryMocks.desc).toHaveBeenCalledWith("created_at");
    expect(orderBy).toHaveBeenCalledWith("created_at");
    expect(limit).toHaveBeenCalledWith(2);
  });
});
