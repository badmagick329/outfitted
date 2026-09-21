import { describe, expect, it, vi } from "vitest";
import { NotificationService, type NotificationServiceDependencies } from "./notification-service";
import type { NotificationRecipient } from "../domain/contracts";

const recipient: NotificationRecipient = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  createdAt: new Date("2026-09-21T10:00:00.000Z"),
  firstGarmentAddedAt: null,
};

function dependencies(overrides: Partial<NotificationServiceDependencies> = {}) {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
    isEnabled: vi.fn().mockReturnValue(true),
    findRecipient: vi.fn().mockResolvedValue(recipient),
    getAccessMode: vi.fn().mockResolvedValue("private"),
    deliver: vi.fn().mockResolvedValue(undefined),
    nextAuthUrl: "https://outfitted.example.com",
    now: () => new Date("2026-09-21T12:00:00.000Z"),
    ...overrides,
  } satisfies NotificationServiceDependencies;
}

describe("NotificationService", () => {
  it("skips enqueueing when Discord is not configured", async () => {
    const deps = dependencies({ isEnabled: () => false });
    const service = new NotificationService(deps);

    await service.enqueue("account_created", "user-1");

    expect(deps.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues a typed job when enabled", async () => {
    const deps = dependencies();
    const service = new NotificationService(deps);

    await service.enqueue("first_garment_added", "user-1");

    expect(deps.enqueue).toHaveBeenCalledWith({ event: "first_garment_added", userId: "user-1" });
  });

  it("skips delivery when Discord is not configured", async () => {
    const deps = dependencies({ isEnabled: () => false });
    const service = new NotificationService(deps);

    await service.process({ event: "account_created", userId: "user-1" });

    expect(deps.findRecipient).not.toHaveBeenCalled();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it("completes without sending when the user no longer exists", async () => {
    const deps = dependencies({ findRecipient: vi.fn().mockResolvedValue(null) });
    const service = new NotificationService(deps);

    await expect(
      service.process({ event: "account_created", userId: "gone" }),
    ).resolves.toBeUndefined();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it("delivers a formatted account embed with the current access mode", async () => {
    const deps = dependencies();
    const service = new NotificationService(deps);

    await service.process({ event: "account_created", userId: "user-1" });

    expect(deps.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            title: "New Outfitted account",
            fields: expect.arrayContaining([
              expect.objectContaining({ name: "Access mode", value: "private" }),
            ]),
          }),
        ],
      }),
    );
  });

  it("propagates delivery failures so pg-boss can retry", async () => {
    const deps = dependencies({ deliver: vi.fn().mockRejectedValue(new Error("status 500")) });
    const service = new NotificationService(deps);

    await expect(
      service.process({ event: "first_garment_added", userId: "user-1" }),
    ).rejects.toThrow("status 500");
  });
});
