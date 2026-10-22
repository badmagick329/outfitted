import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";
import { ReportSelectionService } from "../application/report-selection-service";
import { DrizzleReportSelectionRepository } from "./report-selection-repository";

const connectionString = process.env.AI_BUDGET_TEST_DATABASE_URL;
const testSchema = `ai_report_test_${randomUUID().replaceAll("-", "")}`;
const memberIds = Array.from({ length: 1000 }, () => randomUUID()).sort();
let adminPool: Pool;
let pool: Pool;
let repository: DrizzleReportSelectionRepository;
let service: ReportSelectionService;
describe.skipIf(!connectionString)("saved AI reports against local PostgreSQL", () => {
  beforeAll(async () => {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString!).hostname))
      throw new Error("Report integration tests require a local PostgreSQL URL.");
    adminPool = new Pool({ connectionString });
    await adminPool.query(`CREATE SCHEMA "${testSchema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${testSchema}` });
    for (const migration of (await readdir(path.resolve("drizzle")))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(path.resolve("drizzle", migration), "utf8");
      await pool.query(sql.replaceAll('"public".', `"${testSchema}".`));
    }
    await pool.query(
      "INSERT INTO users(id,email) VALUES('admin-one','one@example.test'),('admin-two','two@example.test')",
    );
    await pool.query(
      "INSERT INTO users(id,email) SELECT id,id || '@example.test' FROM unnest($1::text[]) AS id",
      [memberIds],
    );
    repository = new DrizzleReportSelectionRepository(drizzle({ client: pool, schema }));
    service = new ReportSelectionService(repository, async () => ({ userId: "admin-one" }));
  }, 30000);
  afterAll(async () => {
    await pool?.end();
    if (adminPool) {
      await adminPool.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      await adminPool.end();
    }
  });

  it("persists exactly1000 selected members across a connection restart and enforces the creator predicate", async () => {
    const { selectionId } = await service.create({ memberIds: [...memberIds].reverse() });
    const restartedPool = new Pool({ connectionString, options: `-c search_path=${testSchema}` });
    try {
      const restarted = new DrizzleReportSelectionRepository(
        drizzle({ client: restartedPool, schema }),
      );
      expect((await restarted.findForActor(selectionId, "admin-one"))?.memberIds).toEqual(
        memberIds,
      );
      expect(await restarted.findForActor(selectionId, "admin-two")).toBeNull();
      expect(await restarted.findForActor(randomUUID(), "admin-one")).toBeNull();
      const reader = new ReportSelectionService(restarted, async () => ({ userId: "admin-one" }));
      expect(await reader.resolve({ selection: selectionId }, new Set(memberIds))).toEqual({
        memberIds,
        invalid: false,
        selectionId,
      });
      const otherAdmin = new ReportSelectionService(restarted, async () => ({
        userId: "admin-two",
      }));
      expect(
        await otherAdmin.resolve({ selection: selectionId }, new Set(memberIds)),
      ).toMatchObject({ memberIds: [], invalid: true });
    } finally {
      await restartedPool.end();
    }
  });
  it("rejects unknown members before insert and invalidates snapshots containing a deleted member", async () => {
    const before = (await pool.query("SELECT count(*)::int AS n FROM ai_usage_report_selections"))
      .rows[0].n;
    await expect(service.create({ memberIds: [memberIds[0], randomUUID()] })).rejects.toMatchObject(
      { status: 400 },
    );
    expect(
      (await pool.query("SELECT count(*)::int AS n FROM ai_usage_report_selections")).rows[0].n,
    ).toBe(before);
    const { selectionId } = await service.create({ memberIds: memberIds.slice(0, 2) });
    await pool.query("DELETE FROM users WHERE id=$1", [memberIds[0]]);
    expect(
      await service.resolve(
        { selection: selectionId },
        new Set(await repository.knownMemberIds(memberIds)),
      ),
    ).toMatchObject({ memberIds: [], invalid: true });
    expect((await repository.findForActor(selectionId, "admin-one"))?.memberIds).toEqual(
      memberIds.slice(0, 2),
    );
  });
  it("enforces nonempty snapshots in PostgreSQL", async () => {
    await expect(
      pool.query("INSERT INTO ai_usage_report_selections(actor_user_id,member_ids) VALUES($1,$2)", [
        "admin-one",
        [],
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
