import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  and: vi.fn((...args) => ({ op: "and", args })),
  asc: vi.fn((value) => value),
  desc: vi.fn((value) => value),
  eq: vi.fn((left, right) => ({ op: "eq", left, right })),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(), authOptions: {} }));
vi.mock("drizzle-orm", () => ({
  and: mocks.and,
  asc: mocks.asc,
  desc: mocks.desc,
  eq: mocks.eq,
}));
vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "users.id",
    name: "users.name",
    email: "users.email",
    accessStatus: "users.access_status",
    featureTier: "users.feature_tier",
    createdAt: "users.created_at",
  },
  accessAuditEvents: { table: "access_audit_events" },
  aiAccessRequests: {
    table: "ai_access_requests",
    userId: "ai_access_requests.user_id",
    status: "ai_access_requests.status",
  },
  appSettings: { id: "app_settings.id", accessMode: "app_settings.access_mode" },
}));

import { aiAccessRequests } from "@/lib/db/schema";
import { updateManagedUser } from "./server";

type Chain = {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: unknown) => unknown) => Promise<unknown>;
};

function chain(): Chain {
  const builder = {} as Chain;
  builder.set = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.then = (onFulfilled) => Promise.resolve(undefined).then(onFulfilled);
  return builder;
}

function transactionFor(userRow: Record<string, unknown>) {
  const userUpdate = chain();
  const requestUpdate = chain();
  const insertValues = vi.fn(async () => undefined);
  const transaction = {
    select: vi.fn(() => ({
      from: () => ({ where: () => ({ limit: async () => [userRow] }) }),
    })),
    update: vi.fn((table: unknown) => (table === aiAccessRequests ? requestUpdate : userUpdate)),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(transaction),
  );
  return { transaction, userUpdate, requestUpdate, insertValues };
}

describe("updateManagedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves an outstanding AI request in the same transaction as a manual AI grant", async () => {
    const { transaction, userUpdate, requestUpdate, insertValues } = transactionFor({
      accessStatus: "active",
      featureTier: "inventory",
    });

    await updateManagedUser("admin-1", "user-1", {
      accessStatus: "active",
      featureTier: "ai",
    });

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(userUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ accessStatus: "active", featureTier: "ai" }),
    );
    expect(transaction.update).toHaveBeenCalledWith(aiAccessRequests);
    expect(requestUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", resolvedByUserId: "admin-1" }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actorUserId: "admin-1",
        previousFeatureTier: "inventory",
        nextFeatureTier: "ai",
      }),
    );
  });

  it("leaves requests untouched when the grant does not enable AI", async () => {
    const { transaction, requestUpdate } = transactionFor({
      accessStatus: "pending",
      featureTier: "inventory",
    });

    await updateManagedUser("admin-1", "user-1", {
      accessStatus: "active",
      featureTier: "inventory",
    });

    expect(transaction.update).not.toHaveBeenCalledWith(aiAccessRequests);
    expect(requestUpdate.set).not.toHaveBeenCalled();
  });

  it("resolves a stray pending request even when the AI tier is already stored", async () => {
    const { userUpdate, requestUpdate, insertValues } = transactionFor({
      accessStatus: "active",
      featureTier: "ai",
    });

    await updateManagedUser("admin-1", "user-1", {
      accessStatus: "active",
      featureTier: "ai",
    });

    expect(requestUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", resolvedByUserId: "admin-1" }),
    );
    expect(userUpdate.set).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });
});
