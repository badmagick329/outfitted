import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@auth/drizzle-adapter", () => ({ DrizzleAdapter: vi.fn(() => ({})) }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}));
vi.mock("@/features/notifications/server", () => ({
  notificationService: { enqueue: mocks.enqueue },
}));

import { authOptions } from "./auth";

const createUser = authOptions.events?.createUser as (message: { user: { id: string } }) => void;
const tasks: Array<() => void | Promise<void>> = [];

describe("authOptions account-created notification", () => {
  beforeEach(() => {
    tasks.length = 0;
    mocks.enqueue.mockReset();
    mocks.enqueue.mockResolvedValue(undefined);
    mocks.after.mockReset();
    mocks.after.mockImplementation((task: () => void | Promise<void>) => {
      tasks.push(task);
    });
  });

  it("registers post-response work and returns without waiting for the enqueue", async () => {
    const result = createUser({ user: { id: "user-1" } });

    expect(result).toBeUndefined();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).not.toHaveBeenCalled();

    await tasks[0]();

    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith("account_created", "user-1");
  });

  it("does not wire a sign-in handler, so repeat sign-ins never notify", async () => {
    expect(authOptions.events?.signIn).toBeUndefined();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("contains enqueue failures inside the deferred callback", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.enqueue.mockRejectedValue(new Error("queue unavailable"));

    createUser({ user: { id: "user-1" } });

    await expect(tasks[0]()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
