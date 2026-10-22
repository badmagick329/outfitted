import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { AiBudgetService } from "../application/ai-budget-service";
import { aiBudgetPeriod } from "../domain/period";
import { DrizzleAiBudgetRepository } from "./drizzle-ai-budget-repository";

const connectionString = process.env.AI_BUDGET_TEST_DATABASE_URL;
const testSchema = `ai_budget_test_${randomUUID().replaceAll("-", "")}`;
const now = new Date("2026-10-22T12:00:00Z");
const period = aiBudgetPeriod(now);
let adminPool: Pool;
let pool: Pool;
let repository: DrizzleAiBudgetRepository;

describe.skipIf(!connectionString)("budget persistence against local PostgreSQL", () => {
  beforeAll(async () => {
    // Integration evidence must never target a deployment database, even if a
    // developer's ordinary DATABASE_URL happens to point at one.
    if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString!).hostname))
      throw new Error("Budget integration tests require a local PostgreSQL URL.");
    adminPool = new Pool({ connectionString });
    await adminPool.query(`CREATE SCHEMA "${testSchema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${testSchema}`, max: 12 });
    const migrations = (await readdir(path.resolve("drizzle")))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const migration of migrations) {
      const source = await readFile(path.resolve("drizzle", migration), "utf8");
      if (source.includes('CREATE TABLE "ai_budget_settings"')) {
        await pool.query(
          "INSERT INTO users (id, email) VALUES ('legacy-cutover', 'legacy@example.test')",
        );
        await pool.query(
          "INSERT INTO ai_usage_events (user_id, operation, model, status, estimated_cost_microusd, latency_ms, pricing_version, created_at) VALUES ('legacy-cutover', 'garment_analysis', 'gpt-6-luna', 'success', 1234, 1, 'legacy', $1)",
          [now],
        );
      }
      await pool.query(source.replaceAll('"public".', `"${testSchema}".`));
    }
    await pool.query("INSERT INTO users (id,email) VALUES ('admin','admin@example.test')");
    repository = new DrizzleAiBudgetRepository(drizzle({ client: pool, schema }));
  }, 30_000);

  beforeEach(async () => {
    await repository.setDefaultLimit(5_000_000, "admin", now);
  });

  afterAll(async () => {
    await pool?.end();
    if (adminPool) {
      await adminPool.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      await adminPool.end();
    }
  });

  async function member() {
    const id = randomUUID();
    await pool.query("INSERT INTO users(id,email) VALUES($1,$2)", [id, `${id}@example.test`]);
    return id;
  }

  async function competingProcesses(
    actions: Array<{ action: "reserve" | "default" | "override"; userId: string }>,
  ) {
    const processes = actions.map(({ action, userId }) => {
      const child = spawn(
        "bun",
        [
          "run",
          path.resolve("src/features/ai-budget/infrastructure/test-fixtures/budget-process.ts"),
          action,
          userId,
        ],
        {
          env: {
            ...process.env,
            AI_BUDGET_TEST_DATABASE_URL: connectionString,
            AI_BUDGET_TEST_SCHEMA: testSchema,
          },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let output = "";
      let errors = "";
      let readyResolve: () => void;
      let readyReject: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
      });
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("READY\n")) readyResolve();
      });
      child.stderr.on("data", (chunk) => {
        errors += chunk.toString();
      });
      const done = new Promise<{ pid: number; result: { allowed: boolean } | "updated" }>(
        (resolve, reject) => {
          child.on("error", (error) => {
            readyReject(error);
            reject(error);
          });
          child.on("close", (code) => {
            if (code !== 0) {
              const error = new Error(`Budget child failed: ${errors}`);
              readyReject(error);
              reject(error);
              return;
            }
            const result = output.split("\n").find((line) => line.startsWith("RESULT:"));
            if (!result) {
              reject(new Error(`Budget child omitted its result: ${output}`));
              return;
            }
            resolve(JSON.parse(result.slice("RESULT:".length)));
          });
        },
      );
      // Keep a rejected process observed while its peers are still starting.
      void done.catch(() => undefined);
      return { child, ready, done };
    });
    try {
      await Promise.all(processes.map((process) => process.ready));
      for (const { child } of processes) child.stdin.end("GO\n");
      return await Promise.all(processes.map((process) => process.done));
    } finally {
      for (const { child } of processes) if (child.exitCode === null) child.kill();
    }
  }

  async function reserve(userId: string, amountMicrousd = 3_000_000, at = now) {
    return repository.reserve({
      userId,
      amountMicrousd,
      operation: "garment_analysis",
      model: "gpt-6-luna",
      period: aiBudgetPeriod(at),
      now: at,
    });
  }

  async function allowedReservation(userId: string, at = now) {
    const result = await reserve(userId, 3_000_000, at);
    if (!result.allowed) throw new Error("Test reservation unexpectedly denied.");
    return result.reservation;
  }

  function event(userId: string) {
    return {
      userId,
      operation: "garment_analysis" as const,
      model: "gpt-6-luna",
      status: "success" as const,
      usage: {
        inputTokens: 1000,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
        outputTokens: 1000,
      },
      latencyMs: 1,
    };
  }

  it("migrates preexisting usage without rewriting or double counting it", async () => {
    expect((await repository.getBudgets(["legacy-cutover"], period))[0]).toMatchObject({
      spentMicrousd: 1234,
      availableMicrousd: 4_998_766,
    });
    expect((await repository.getBudgets(["legacy-cutover"], period))[0].spentMicrousd).toBe(1234);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM ai_usage_events WHERE user_id='legacy-cutover'",
        )
      ).rows[0].n,
    ).toBe(1);
  });

  it("persists defaults and overrides across a connection-pool restart and month reset", async () => {
    const id = await member();
    await repository.setDefaultLimit(6_000_000, "admin", now);
    await repository.setMemberOverride(id, 7_000_000, "admin", now);
    const restartedPool = new Pool({ connectionString, options: `-c search_path=${testSchema}` });
    try {
      const restarted = new DrizzleAiBudgetRepository(drizzle({ client: restartedPool, schema }));
      expect(await restarted.getDefaultLimit()).toBe(6_000_000);
      expect(
        (await restarted.getBudgets([id], aiBudgetPeriod(new Date("2026-11-15Z"))))[0],
      ).toMatchObject({
        limitMicrousd: 7_000_000,
        overrideLimitMicrousd: 7_000_000,
        spentMicrousd: 0,
      });
      await restarted.setMemberOverride(id, null, "admin", now);
      expect((await repository.getBudgets([id], period))[0].limitMicrousd).toBe(6_000_000);
    } finally {
      await restartedPool.end();
    }
  });

  it("serializes simultaneous reservations from independent callers", async () => {
    const id = await member();
    const results = await Promise.all(Array.from({ length: 8 }, () => reserve(id)));
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      reservedMicrousd: 3_000_000,
      availableMicrousd: 2_000_000,
    });
  });

  it("prevents independent OS processes from spending the same allowance", async () => {
    const id = await member();
    const results = await competingProcesses(
      Array.from({ length: 4 }, () => ({ action: "reserve", userId: id })),
    );
    expect(new Set(results.map((result) => result.pid)).size).toBe(4);
    expect(
      results.filter(({ result }) => typeof result !== "string" && result.allowed),
    ).toHaveLength(1);
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      reservedMicrousd: 3_000_000,
      availableMicrousd: 2_000_000,
    });
  }, 30_000);

  it("serializes independent-process default and override edits with admission", async () => {
    const id = await member();
    const results = await competingProcesses([
      { action: "reserve", userId: id },
      { action: "default", userId: id },
      { action: "override", userId: id },
    ]);
    expect(new Set(results.map((result) => result.pid)).size).toBe(3);
    const [budget] = await repository.getBudgets([id], period);
    expect(budget).toMatchObject({
      defaultLimitMicrousd: 0,
      overrideLimitMicrousd: 0,
      availableMicrousd: 0,
    });
    expect([0, 3_000_000]).toContain(budget.reservedMicrousd);
    expect((await reserve(id, 1)).allowed).toBe(false);
  }, 30_000);

  it("settles concurrent duplicate completions exactly once and retains spend through edits", async () => {
    const id = await member();
    const reservation = await allowedReservation(id);
    await repository.markDispatched(reservation.id, now);
    await Promise.all(
      Array.from({ length: 4 }, () =>
        repository.settle({ reservationId: reservation.id, usageEvent: event(id), now }),
      ),
    );
    expect(
      (await pool.query("SELECT count(*)::int AS n FROM ai_usage_events WHERE user_id=$1", [id]))
        .rows[0].n,
    ).toBe(1);
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      spentMicrousd: 600,
      reservedMicrousd: 0,
      availableMicrousd: 4_999_400,
    });
    await repository.setMemberOverride(id, 100, "admin", now);
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      spentMicrousd: 600,
      availableMicrousd: 0,
    });
    expect((await reserve(id, 1)).allowed).toBe(false);
    await repository.setDefaultLimit(8_000_000, "admin", now);
    await repository.setMemberOverride(id, null, "admin", now);
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      spentMicrousd: 600,
      limitMicrousd: 8_000_000,
    });
  });

  it("attributes late completion to the admission month without charging its usage event again", async () => {
    const id = await member();
    const old = new Date("2026-10-31T23:59:59Z");
    const reservation = await allowedReservation(id, old);
    await repository.markDispatched(reservation.id, old);
    await repository.settle({
      reservationId: reservation.id,
      usageEvent: event(id),
      now: new Date("2026-11-01T00:00:01Z"),
    });
    expect((await repository.getBudgets([id], period))[0].spentMicrousd).toBe(600);
    expect(
      (await repository.getBudgets([id], aiBudgetPeriod(new Date("2026-11-01T00:00:01Z"))))[0]
        .spentMicrousd,
    ).toBe(0);
  });

  it("places legacy events at the exact London boundary in the new month only", async () => {
    const id = await member();
    for (const [at, cost] of [
      ["2026-03-31T22:59:59.999Z", 10],
      ["2026-03-31T23:00:00Z", 20],
    ] as const) {
      await pool.query(
        "INSERT INTO ai_usage_events (user_id, operation, model, status, estimated_cost_microusd, latency_ms, pricing_version, created_at) VALUES ($1,'garment_analysis','gpt-6-luna','success',$2,1,'legacy',$3)",
        [id, cost, new Date(at)],
      );
    }
    expect(
      (await repository.getBudgets([id], aiBudgetPeriod(new Date("2026-03-31T22:59:59Z"))))[0]
        .spentMicrousd,
    ).toBe(10);
    expect(
      (await repository.getBudgets([id], aiBudgetPeriod(new Date("2026-03-31T23:00:00Z"))))[0]
        .spentMicrousd,
    ).toBe(20);
  });

  it("records the entire actual charge even if an adapter supplied an insufficient hold", async () => {
    const id = await member();
    await repository.setMemberOverride(id, 500, "admin", now);
    const admission = await reserve(id, 1);
    if (!admission.allowed) throw new Error("Test admission unexpectedly rejected.");
    await repository.markDispatched(admission.reservation.id, now);
    await repository.settle({
      reservationId: admission.reservation.id,
      usageEvent: event(id),
      now,
    });
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      spentMicrousd: 600,
      reservedMicrousd: 0,
      availableMicrousd: 0,
    });
    expect((await reserve(id, 1)).allowed).toBe(false);
  });

  it("recovers unsent holds but retains dispatched liabilities and allows later settlement", async () => {
    const unsentUser = await member();
    const sentUser = await member();
    const unsent = await allowedReservation(unsentUser);
    const sent = await allowedReservation(sentUser);
    await repository.markDispatched(sent.id, now);
    const later = new Date(now.getTime() + 60_000);
    expect(await repository.recover(later, later)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: sent.id, status: "uncertain" })]),
    );
    expect((await repository.getBudgets([unsentUser], period))[0].reservedMicrousd).toBe(0);
    await expect(repository.markDispatched(unsent.id, later)).rejects.toThrow("unsent");
    expect((await repository.getBudgets([sentUser], period))[0].reservedMicrousd).toBe(3_000_000);
    await expect(
      repository.release({ reservationId: sent.id, definitelyUnused: false, now: later }),
    ).rejects.toThrow("Uncertain");
    await repository.settle({ reservationId: sent.id, usageEvent: event(sentUser), now: later });
    expect((await repository.getBudgets([sentUser], period))[0]).toMatchObject({
      spentMicrousd: 600,
      reservedMicrousd: 0,
    });
  });

  it("rolls back usage insertion and liability changes together on persistence failure", async () => {
    const id = await member();
    const reservation = await allowedReservation(id);
    await repository.markDispatched(reservation.id, now);
    await expect(
      repository.settle({
        reservationId: reservation.id,
        usageEvent: { ...event(id), latencyMs: 2_147_483_648 },
        now,
      }),
    ).rejects.toThrow();
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      spentMicrousd: 0,
      reservedMicrousd: 3_000_000,
    });
    expect(
      (await pool.query("SELECT count(*)::int AS n FROM ai_usage_events WHERE user_id=$1", [id]))
        .rows[0].n,
    ).toBe(0);
  });

  it("configuration edits and reservations cannot observe a partially changed policy", async () => {
    const id = await member();
    await Promise.all([
      reserve(id),
      repository.setDefaultLimit(0, "admin", now),
      repository.setMemberOverride(id, 0, "admin", now),
    ]);
    const [budget] = await repository.getBudgets([id], period);
    expect(budget).toMatchObject({
      defaultLimitMicrousd: 0,
      overrideLimitMicrousd: 0,
      availableMicrousd: 0,
    });
    expect([0, 3_000_000]).toContain(budget.reservedMicrousd);
    expect((await reserve(id, 1)).allowed).toBe(false);
  });

  it("invalid and unauthorized writes leave the durable configuration intact", async () => {
    const id = await member();
    const denied = new AiBudgetService(repository, async () => false);
    const admin = new AiBudgetService(repository, async () => true);
    await expect(denied.setDefaultLimit("admin", 0)).rejects.toThrow("Administrator");
    await expect(denied.setMemberOverride("admin", id, 0)).rejects.toThrow("Administrator");
    await expect(admin.setDefaultLimit("admin", -1)).rejects.toThrow();
    await expect(admin.setMemberOverride("admin", id, "0")).rejects.toThrow();
    expect((await repository.getBudgets([id], period))[0]).toMatchObject({
      defaultLimitMicrousd: 5_000_000,
      overrideLimitMicrousd: null,
    });
    await expect(
      pool.query("UPDATE ai_budget_settings SET default_limit_microusd=-1"),
    ).rejects.toThrow();
  });

  it("records durable before/after configuration history including override removal", async () => {
    const id = await member();
    await repository.setDefaultLimit(6_000_000, "admin", now);
    await repository.setMemberOverride(id, 0, "admin", now);
    await repository.setMemberOverride(id, 200, "admin", now);
    await repository.setMemberOverride(id, null, "admin", now);
    await repository.setMemberOverride(id, null, "admin", now);
    const events = await repository.listAuditEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        scope: "default",
        actorUserId: "admin",
        targetUserId: null,
        previousLimitMicrousd: 5_000_000,
        nextLimitMicrousd: 6_000_000,
      }),
    );
    expect(events.filter((event) => event.targetUserId === id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "member",
          actorUserId: "admin",
          previousLimitMicrousd: null,
          nextLimitMicrousd: 0,
        }),
        expect.objectContaining({ previousLimitMicrousd: 0, nextLimitMicrousd: 200 }),
        expect.objectContaining({ previousLimitMicrousd: 200, nextLimitMicrousd: null }),
      ]),
    );
    expect(events.filter((event) => event.targetUserId === id)).toHaveLength(3);
  });

  it("rolls back a policy edit when its audit append fails", async () => {
    const id = await member();
    await pool.query(
      "CREATE FUNCTION reject_budget_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit append rejected'; END $$",
    );
    await pool.query(
      "CREATE TRIGGER reject_budget_audit BEFORE INSERT ON ai_budget_audit_events FOR EACH ROW EXECUTE FUNCTION reject_budget_audit()",
    );
    try {
      await expect(repository.setMemberOverride(id, 0, "admin", now)).rejects.toThrow();
      expect((await repository.getBudgets([id], period))[0].overrideLimitMicrousd).toBeNull();
    } finally {
      await pool.query("DROP FUNCTION reject_budget_audit() CASCADE");
    }
  });
});
