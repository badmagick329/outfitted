import { describe, expect, it, vi } from "vitest";
import { AiAccessService } from "./ai-access-service";
import type { AiAccessRequestRecord, AiAccessRequestRepository } from "../domain/repository";

function record(overrides: Partial<AiAccessRequestRecord> = {}): AiAccessRequestRecord {
  return {
    id: "request-1",
    userId: "user-1",
    status: "pending",
    resolvedByUserId: null,
    resolvedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function fakeRepository(seed: AiAccessRequestRecord[] = []) {
  const requests = [...seed];
  const repository: AiAccessRequestRepository = {
    findLatestForUser: vi.fn(async (userId: string) => {
      const owned = requests.filter((request) => request.userId === userId);
      return owned.length ? owned[owned.length - 1] : null;
    }),
    createPending: vi.fn(async (userId: string) => {
      const existing = requests.find(
        (request) => request.userId === userId && request.status === "pending",
      );
      if (existing) return { request: existing, created: false };
      const created = record({ id: `request-${requests.length + 1}`, userId });
      requests.push(created);
      return { request: created, created: true };
    }),
    listPending: vi.fn(async () =>
      requests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          ...request,
          userName: null,
          userEmail: "member@example.com",
        })),
    ),
    approve: vi.fn(async (requestId: string, actorUserId: string) => {
      const request = requests.find((candidate) => candidate.id === requestId);
      if (!request || request.status !== "pending") return "not_pending";
      request.status = "approved";
      request.resolvedByUserId = actorUserId;
      request.resolvedAt = new Date();
      return "resolved";
    }),
    decline: vi.fn(async (requestId: string, actorUserId: string) => {
      const request = requests.find((candidate) => candidate.id === requestId);
      if (!request || request.status !== "pending") return "not_pending";
      request.status = "declined";
      request.resolvedByUserId = actorUserId;
      request.resolvedAt = new Date();
      return "resolved";
    }),
  };
  return { repository, requests };
}

function serviceFor(
  account: { accessStatus: "pending" | "active" | "disabled"; canUseAi: boolean } | null,
  seed: AiAccessRequestRecord[] = [],
) {
  const { repository, requests } = fakeRepository(seed);
  const access = { getById: vi.fn(async () => account) };
  return { service: new AiAccessService({ repository, access }), repository, requests };
}

const inventoryUser = { accessStatus: "active" as const, canUseAi: false };

describe("AiAccessService.submit", () => {
  it("lets an active inventory-only member submit a request", async () => {
    const { service, repository, requests } = serviceFor(inventoryUser);

    await expect(service.submit("user-1")).resolves.toMatchObject({
      userId: "user-1",
      status: "pending",
    });
    expect(repository.createPending).toHaveBeenCalledWith("user-1");
    expect(requests).toHaveLength(1);
  });

  it("rejects members who already have AI access", async () => {
    const { service, repository } = serviceFor({ accessStatus: "active", canUseAi: true });

    await expect(service.submit("user-1")).rejects.toMatchObject({ status: 409 });
    expect(repository.createPending).not.toHaveBeenCalled();
  });

  it("rejects members whose account is not active", async () => {
    for (const accessStatus of ["pending", "disabled"] as const) {
      const { service, repository } = serviceFor({ accessStatus, canUseAi: false });
      await expect(service.submit("user-1")).rejects.toMatchObject({ status: 403 });
      expect(repository.createPending).not.toHaveBeenCalled();
    }
  });

  it("never queues AI work when a request is submitted", async () => {
    const { service, repository } = serviceFor(inventoryUser);

    await service.submit("user-1");

    expect(repository.approve).not.toHaveBeenCalled();
    expect(repository.decline).not.toHaveBeenCalled();
  });

  it("prevents a second pending request", async () => {
    const { service, repository, requests } = serviceFor(inventoryUser);

    await service.submit("user-1");
    await expect(service.submit("user-1")).rejects.toMatchObject({ status: 409 });
    expect(repository.createPending).toHaveBeenCalledTimes(2);
    expect(requests).toHaveLength(1);
  });

  it("inspires a fresh request after a decline", async () => {
    const declined = record({ status: "declined", resolvedByUserId: "admin-1" });
    const { service, repository, requests } = serviceFor(inventoryUser, [declined]);

    await expect(service.submit("user-1")).resolves.toMatchObject({ status: "pending" });
    expect(repository.createPending).toHaveBeenCalledWith("user-1");
    expect(requests).toHaveLength(2);
  });

  it("admits public-mode members but still requires a separate AI request", async () => {
    const { service, requests } = serviceFor(inventoryUser);

    await service.submit("user-1");

    expect(requests[0]).toMatchObject({ status: "pending" });
  });
});

describe("AiAccessService.resolve", () => {
  it("approves through the repository once", async () => {
    const { service, repository } = serviceFor(inventoryUser, [record()]);

    await service.resolve("admin-1", "request-1", { decision: "approved" });

    expect(repository.approve).toHaveBeenCalledWith("request-1", "admin-1");
    expect(repository.decline).not.toHaveBeenCalled();
  });

  it("declines without granting AI", async () => {
    const { service, repository, requests } = serviceFor(inventoryUser, [record()]);

    await service.resolve("admin-1", "request-1", { decision: "declined" });

    expect(repository.decline).toHaveBeenCalledWith("request-1", "admin-1");
    expect(repository.approve).not.toHaveBeenCalled();
    expect(requests[0]).toMatchObject({ status: "declined" });
  });

  it("cannot resolve an already-resolved request twice", async () => {
    const { service } = serviceFor(inventoryUser, [
      record({ status: "approved", resolvedByUserId: "admin-1" }),
    ]);

    await expect(
      service.resolve("admin-2", "request-1", { decision: "approved" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
