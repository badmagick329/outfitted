import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiBudgetRepository } from "../domain/repository";
import { AiBudgetService } from "./ai-budget-service";

const repository = {
  getDefaultLimit: vi.fn(),
  getBudgets: vi.fn(),
  setDefaultLimit: vi.fn(),
  setMemberOverride: vi.fn(),
} as unknown as AiBudgetRepository;
const authorize = vi.fn();
const now = new Date("2026-03-31T23:00:00Z");
const service = new AiBudgetService(repository, authorize, { now: () => now });

describe("budget configuration boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorize.mockResolvedValue(true);
  });
  it("uses its injectable clock and deduplicates requested members", async () => {
    await service.getBudgets(["one", "one", "two"]);
    expect(repository.getBudgets).toHaveBeenCalledWith(["one", "two"], {
      key: "2026-04",
      startsAt: now,
      endsAt: new Date("2026-04-30T23:00:00Z"),
    });
  });
  it("authorizes every configuration write before persistence", async () => {
    authorize.mockResolvedValue(false);
    await expect(service.setDefaultLimit("member", 0)).rejects.toThrow("Administrator");
    await expect(service.setMemberOverride("member", "target", null)).rejects.toThrow(
      "Administrator",
    );
    expect(repository.setDefaultLimit).not.toHaveBeenCalled();
    expect(repository.setMemberOverride).not.toHaveBeenCalled();
  });
  it.each([-1, 0.5, "5", undefined, NaN])(
    "invalid amount %s cannot reach persistence",
    async (amount) => {
      await expect(service.setDefaultLimit("admin", amount)).rejects.toThrow();
      await expect(service.setMemberOverride("admin", "target", amount)).rejects.toThrow();
      expect(repository.setDefaultLimit).not.toHaveBeenCalled();
      expect(repository.setMemberOverride).not.toHaveBeenCalled();
    },
  );
  it("preserves zero and removes overrides only on explicit null", async () => {
    await service.setMemberOverride("admin", "target", 0);
    await service.setMemberOverride("admin", "target", null);
    expect(repository.setMemberOverride).toHaveBeenNthCalledWith(1, "target", 0, "admin", now);
    expect(repository.setMemberOverride).toHaveBeenNthCalledWith(2, "target", null, "admin", now);
  });
});
