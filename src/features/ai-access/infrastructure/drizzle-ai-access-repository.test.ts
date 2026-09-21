import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  and: vi.fn((...args) => ({ op: "and", args })),
  asc: vi.fn((value) => value),
  desc: vi.fn((value) => value),
  eq: vi.fn((left, right) => ({ op: "eq", left, right })),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("drizzle-orm", () => ({
  and: mocks.and,
  asc: mocks.asc,
  desc: mocks.desc,
  eq: mocks.eq,
}));
vi.mock("@/lib/db/schema", () => ({
  aiAccessRequests: {
    id: "ai_access_requests.id",
    userId: "ai_access_requests.user_id",
    status: "ai_access_requests.status",
    resolvedByUserId: "ai_access_requests.resolved_by_user_id",
    resolvedAt: "ai_access_requests.resolved_at",
    createdAt: "ai_access_requests.created_at",
    updatedAt: "ai_access_requests.updated_at",
  },
  accessAuditEvents: { table: "access_audit_events" },
  users: {
    id: "users.id",
    name: "users.name",
    email: "users.email",
    accessStatus: "users.access_status",
    featureTier: "users.feature_tier",
  },
}));

import { accessAuditEvents, aiAccessRequests } from "@/lib/db/schema";
import { DrizzleAiAccessRequestRepository } from "./drizzle-ai-access-repository";

type Chain = {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: unknown) => unknown) => Promise<unknown>;
};

function updateChain(returningRows: unknown[] = []): Chain {
  const chain = {} as Chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(async () => returningRows);
  chain.then = (onFulfilled) => Promise.resolve(undefined).then(onFulfilled);
  return chain;
}

function insertChain(returningRows: unknown[] = []) {
  const chain = {
    values: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
    returning: vi.fn(async () => returningRows),
  };
  return chain;
}

function selectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(rows).then(onFulfilled),
  };
  return chain;
}

const requestRow = {
  id: "request-1",
  userId: "user-1",
  status: "pending",
  resolvedByUserId: null,
  resolvedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("DrizzleAiAccessRequestRepository.approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the request, enables AI, and records the audit event in one transaction", async () => {
    const requestUpdate = updateChain([{ userId: "user-1" }]);
    const userUpdate = updateChain();
    const insertValues = vi.fn(async () => undefined);
    const transaction = {
      update: vi.fn((table: unknown) => (table === aiAccessRequests ? requestUpdate : userUpdate)),
      select: vi.fn(() =>
        selectChain([{ id: "user-1", accessStatus: "active", featureTier: "inventory" }]),
      ),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    );

    await expect(
      new DrizzleAiAccessRequestRepository().approve("request-1", "admin-1"),
    ).resolves.toBe("resolved");

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(requestUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", resolvedByUserId: "admin-1" }),
    );
    expect(userUpdate.set).toHaveBeenCalledWith({
      featureTier: "ai",
      updatedAt: expect.any(Date),
    });
    expect(transaction.insert).toHaveBeenCalledWith(accessAuditEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: "user-1",
      actorUserId: "admin-1",
      previousAccessStatus: "active",
      nextAccessStatus: "active",
      previousFeatureTier: "inventory",
      nextFeatureTier: "ai",
    });
  });

  it("reports not_pending without writing a tier or audit event when already resolved", async () => {
    const requestUpdate = updateChain([]);
    const transaction = {
      update: vi.fn(() => requestUpdate),
      select: vi.fn(),
      insert: vi.fn(),
    };
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    );

    await expect(
      new DrizzleAiAccessRequestRepository().approve("request-1", "admin-1"),
    ).resolves.toBe("not_pending");

    expect(transaction.select).not.toHaveBeenCalled();
    expect(transaction.insert).not.toHaveBeenCalled();
  });

  it("only ever updates a request that is still pending", async () => {
    const requestUpdate = updateChain([{ userId: "user-1" }]);
    const userUpdate = updateChain();
    const transaction = {
      update: vi.fn((table: unknown) => (table === aiAccessRequests ? requestUpdate : userUpdate)),
      select: vi.fn(() =>
        selectChain([{ id: "user-1", accessStatus: "pending", featureTier: "inventory" }]),
      ),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    };
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    );

    await new DrizzleAiAccessRequestRepository().approve("request-1", "admin-1");

    expect(mocks.and).toHaveBeenCalledWith(
      { op: "eq", left: aiAccessRequests.id, right: "request-1" },
      { op: "eq", left: aiAccessRequests.status, right: "pending" },
    );
  });

  it("updates an existing member without altering their stored access status", async () => {
    const requestUpdate = updateChain([{ userId: "user-1" }]);
    const userUpdate = updateChain();
    const transaction = {
      update: vi.fn((table: unknown) => (table === aiAccessRequests ? requestUpdate : userUpdate)),
      select: vi.fn(() =>
        selectChain([{ id: "user-1", accessStatus: "pending", featureTier: "inventory" }]),
      ),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    };
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    );

    await new DrizzleAiAccessRequestRepository().approve("request-1", "admin-1");

    expect(userUpdate.set).toHaveBeenCalledWith({
      featureTier: "ai",
      updatedAt: expect.any(Date),
    });
    expect(userUpdate.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ accessStatus: expect.anything() }),
    );
  });
});

describe("DrizzleAiAccessRequestRepository.decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks only the request declined without touching the member", async () => {
    const declineChain = updateChain([{ id: "request-1" }]);
    mocks.db.update.mockReturnValue(declineChain);

    await expect(
      new DrizzleAiAccessRequestRepository().decline("request-1", "admin-1"),
    ).resolves.toBe("resolved");

    expect(mocks.db.transaction).not.toHaveBeenCalled();
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(declineChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "declined", resolvedByUserId: "admin-1" }),
    );
  });

  it("reports not_pending when the request was already resolved", async () => {
    mocks.db.update.mockReturnValue(updateChain([]));

    await expect(
      new DrizzleAiAccessRequestRepository().decline("request-1", "admin-1"),
    ).resolves.toBe("not_pending");
  });
});

describe("DrizzleAiAccessRequestRepository.createPending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the existing pending request when the unique index rejects the insert", async () => {
    mocks.db.insert.mockReturnValue(insertChain([]));
    mocks.db.select.mockReturnValue(selectChain([requestRow]));

    await expect(new DrizzleAiAccessRequestRepository().createPending("user-1")).resolves.toEqual({
      request: expect.objectContaining({ id: "request-1", status: "pending" }),
      created: false,
    });
    expect(mocks.and).toHaveBeenCalledWith(
      { op: "eq", left: aiAccessRequests.userId, right: "user-1" },
      { op: "eq", left: aiAccessRequests.status, right: "pending" },
    );
  });

  it("creates a new pending request when none is outstanding", async () => {
    mocks.db.insert.mockReturnValue(insertChain([requestRow]));

    await expect(new DrizzleAiAccessRequestRepository().createPending("user-1")).resolves.toEqual({
      request: expect.objectContaining({ id: "request-1" }),
      created: true,
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});
