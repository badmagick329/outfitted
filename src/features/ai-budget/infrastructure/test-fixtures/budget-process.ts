import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { aiBudgetPeriod } from "../../domain/period";
import { DrizzleAiBudgetRepository } from "../drizzle-ai-budget-repository";

const connectionString = process.env.AI_BUDGET_TEST_DATABASE_URL;
const testSchema = process.env.AI_BUDGET_TEST_SCHEMA;
if (
  !connectionString ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)
)
  throw new Error("A local test database is required.");
if (!testSchema || !/^ai_budget_test_[a-f0-9]+$/.test(testSchema))
  throw new Error("An isolated test schema is required.");
const pool = new Pool({ connectionString, options: `-c search_path=${testSchema}` });
const repository = new DrizzleAiBudgetRepository(drizzle({ client: pool, schema }));
const [action, userId] = process.argv.slice(2);

// The parent starts every independent process before releasing this barrier,
// so admission and policy edits genuinely contend on PostgreSQL locks.
process.stdout.write("READY\n");
process.stdin.once("data", async () => {
  const now = new Date("2026-10-22T12:00:00Z");
  try {
    let result: unknown;
    if (action === "reserve")
      result = await repository.reserve({
        userId,
        operation: "garment_analysis",
        model: "gpt-6-luna",
        amountMicrousd: 3_000_000,
        period: aiBudgetPeriod(now),
        now,
      });
    else if (action === "default") {
      await repository.setDefaultLimit(0, "admin", now);
      result = "updated";
    } else if (action === "override") {
      await repository.setMemberOverride(userId, 0, "admin", now);
      result = "updated";
    } else throw new Error("Unknown test process action.");
    process.stdout.write(`RESULT:${JSON.stringify({ pid: process.pid, result })}\n`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    process.stdin.destroy();
  }
});
