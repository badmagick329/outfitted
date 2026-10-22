import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { trackAiCall } from "@/features/ai-usage/application/track-ai-call";
import { DrizzleAiBudgetRepository } from "@/features/ai-budget/infrastructure/drizzle-ai-budget-repository";
import { DrizzleFeatureRunRepository } from "./drizzle-feature-run-repository";

const connectionString = process.env.AI_BUDGET_TEST_DATABASE_URL;
const testSchema = `feature_run_test_${randomUUID().replaceAll("-", "")}`;
const feature = "bulk_wardrobe_reanalysis";
let admin: Pool;
let pool: Pool;
let runs: DrizzleFeatureRunRepository;
let budgets: DrizzleAiBudgetRepository;

describe.skipIf(!connectionString)("bulk grant accounting against local PostgreSQL", () => {
  beforeAll(async () => {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString!).hostname))
      throw new Error("Grant integration tests require a local PostgreSQL URL.");
    admin = new Pool({ connectionString });
    await admin.query(`CREATE SCHEMA "${testSchema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${testSchema}`, max: 8 });
    for (const migration of (await readdir(path.resolve("drizzle")))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await pool.query(
        (await readFile(path.resolve("drizzle", migration), "utf8")).replaceAll(
          '"public".',
          `"${testSchema}".`,
        ),
      );
    }
    const database = drizzle({ client: pool, schema });
    runs = new DrizzleFeatureRunRepository(database);
    budgets = new DrizzleAiBudgetRepository(database);
  }, 30_000);

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      await admin.end();
    }
  });

  async function member() {
    const id = randomUUID();
    await pool.query("INSERT INTO users(id,email) VALUES($1,$2)", [id, `${id}@example.test`]);
    await pool.query(
      "INSERT INTO user_feature_grants(user_id,feature_key,remaining_uses,granted_by_user_id) VALUES($1,$2,1,$1)",
      [id, feature],
    );
    return id;
  }

  async function remaining(userId: string) {
    return (
      await pool.query("SELECT remaining_uses FROM user_feature_grants WHERE user_id=$1", [userId])
    ).rows[0]?.remaining_uses;
  }

  it("claims a grant once across simultaneous bulk requests", async () => {
    const userId = await member();
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => runs.begin(userId, feature, [randomUUID()])),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await remaining(userId)).toBe(0);
  });

  it("restores exactly once when every queued item is denied before admission", async () => {
    const userId = await member();
    const ids = [randomUUID(), randomUUID()];
    const runId = await runs.begin(userId, feature, ids);
    await runs.completeItem(runId, ids[0]);
    expect(await remaining(userId)).toBe(0);
    await Promise.all(Array.from({ length: 4 }, () => runs.completeItem(runId, ids[1])));
    expect(await remaining(userId)).toBe(1);
  });

  it("keeps the grant consumed if any provider work was admitted", async () => {
    const userId = await member();
    const itemId = randomUUID();
    const runId = await runs.begin(userId, feature, [itemId]);
    await runs.admit(runId);
    await runs.completeItem(runId, itemId);
    expect(await remaining(userId)).toBe(0);
  });

  it("restores a budget-denied worker run without calling the provider", async () => {
    const userId = await member();
    const itemId = randomUUID();
    const runId = await runs.begin(userId, feature, [itemId]);
    const call = vi.fn();
    await budgets.setMemberOverride(userId, 0, userId, new Date());
    await expect(
      trackAiCall({
        budget: budgets,
        userId,
        operation: "garment_analysis",
        model: "gpt-6-luna",
        reservationMicrousd: 236_644,
        onAdmitted: () => runs.admit(runId),
        call,
      }),
    ).rejects.toMatchObject({ code: "AI_BUDGET_EXHAUSTED" });
    expect(call).not.toHaveBeenCalled();
    await runs.completeItem(runId, itemId);
    expect(await remaining(userId)).toBe(1);
  });

  it("expires abandoned queue runs, restores unused grants and rejects their late jobs", async () => {
    const userId = await member();
    const runId = await runs.begin(userId, feature, [randomUUID()]);
    await runs.recover(new Date(Date.now() + 1000));
    await runs.recover(new Date(Date.now() + 1000));
    expect(await remaining(userId)).toBe(1);
    await expect(runs.admit(runId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("never restores an expired run that had admitted uncertain provider work", async () => {
    const userId = await member();
    const runId = await runs.begin(userId, feature, [randomUUID()]);
    await runs.admit(runId);
    await runs.recover(new Date(Date.now() + 1000));
    expect(await remaining(userId)).toBe(0);
  });

  it("fences older completion from a later admin grant and its consumption", async () => {
    const userId = await member();
    const oldItem = randomUUID();
    const oldRun = await runs.begin(userId, feature, [oldItem]);
    await pool.query(
      "UPDATE user_feature_grants SET remaining_uses=1,generation=$2 WHERE user_id=$1",
      [userId, randomUUID()],
    );
    const newItem = randomUUID();
    const newRun = await runs.begin(userId, feature, [newItem]);
    await runs.completeItem(oldRun, oldItem);
    expect(await remaining(userId)).toBe(0);
    await runs.completeItem(newRun, newItem);
    expect(await remaining(userId)).toBe(1);
  });

  it("never recreates a revoked grant on completion", async () => {
    const userId = await member();
    const itemId = randomUUID();
    const runId = await runs.begin(userId, feature, [itemId]);
    await pool.query("DELETE FROM user_feature_grants WHERE user_id=$1", [userId]);
    await runs.completeItem(runId, itemId);
    expect(await remaining(userId)).toBeUndefined();
  });
});
