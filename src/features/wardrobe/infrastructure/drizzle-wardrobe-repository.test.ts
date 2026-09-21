import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  and: vi.fn((...args) => ({ op: "and", args })),
  eq: vi.fn((left, right) => ({ op: "eq", left, right })),
  isNull: vi.fn((value) => ({ op: "isNull", value })),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { update: mocks.update } }));
vi.mock("drizzle-orm", () => ({
  and: mocks.and,
  desc: vi.fn(),
  eq: mocks.eq,
  inArray: vi.fn(),
  isNotNull: vi.fn(),
  isNull: mocks.isNull,
  sql: vi.fn(),
}));
vi.mock("@/lib/db/schema", () => ({
  itemPhotos: { table: "item_photos" },
  wardrobeItems: { table: "wardrobe_items" },
  users: {
    id: "users.id",
    firstGarmentAddedAt: "users.first_garment_added_at",
    updatedAt: "users.updated_at",
  },
}));

import { users } from "@/lib/db/schema";
import { DrizzleWardrobeRepository } from "./drizzle-wardrobe-repository";

function updateChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  mocks.update.mockReturnValue({ set });
  return { set, where, returning };
}

describe("DrizzleWardrobeRepository.claimFirstGarmentMilestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims the milestone only when the timestamp is still unset", async () => {
    const { set, where } = updateChain([{ id: "user-1" }]);

    await expect(
      new DrizzleWardrobeRepository().claimFirstGarmentMilestone("user-1"),
    ).resolves.toBe(true);

    expect(mocks.update).toHaveBeenCalledWith(users);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ firstGarmentAddedAt: expect.any(Date) }),
    );
    expect(mocks.isNull).toHaveBeenCalledWith(users.firstGarmentAddedAt);
    expect(mocks.eq).toHaveBeenCalledWith(users.id, "user-1");
    expect(where).toHaveBeenCalledOnce();
  });

  it("reports a loss when another request already set the timestamp", async () => {
    updateChain([]);

    await expect(
      new DrizzleWardrobeRepository().claimFirstGarmentMilestone("user-1"),
    ).resolves.toBe(false);
  });
});
