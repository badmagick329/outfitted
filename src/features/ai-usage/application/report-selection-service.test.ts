import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { forbidden, unauthorized } from "@/shared/application-error";
import type { ReportSelectionRepository, SavedReportSelection } from "../domain/report-selections";
import { ReportSelectionService } from "./report-selection-service";

const token = "dfb80000-0000-4000-8000-000000000001";
const memberIds = Array.from(
  { length: 1000 },
  (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
);
let records: SavedReportSelection[];
let known: Set<string>;
let actor: string;
let repository: ReportSelectionRepository;
let authorize: Mock<() => Promise<{ userId: string }>>;
let service: ReportSelectionService;
beforeEach(() => {
  records = [];
  known = new Set(memberIds);
  actor = "admin-one";
  authorize = vi.fn(async () => ({ userId: actor }));
  repository = {
    knownMemberIds: vi.fn(async (ids: string[]) => ids.filter((id) => known.has(id))),
    create: vi.fn(async (actorUserId: string, ids: string[]) => {
      const record = { id: token, actorUserId, memberIds: [...ids], createdAt: new Date() };
      records.push(record);
      return record;
    }),
    findForActor: vi.fn(
      async (id: string, actorUserId: string) =>
        records.find((record) => record.id === id && record.actorUserId === actorUserId) ?? null,
    ),
  };
  service = new ReportSelectionService(repository, authorize);
});
describe("durable report selections", () => {
  it("saves an immutable exact group of 1000 members and resolves it only for its creator", async () => {
    const input = [...memberIds].reverse();
    expect(await service.create({ memberIds: input })).toEqual({ selectionId: token });
    input.pop();
    expect(records[0].memberIds).toEqual(memberIds);
    expect(await service.resolve({ selection: token }, known)).toEqual({
      memberIds,
      selectionId: token,
      invalid: false,
    });
    actor = "admin-two";
    expect(await service.resolve({ selection: token }, known)).toEqual({
      memberIds: [],
      selectionId: token,
      invalid: true,
    });
    expect(repository.findForActor).toHaveBeenLastCalledWith(token, "admin-two");
  });
  it.each([unauthorized(), forbidden()])(
    "authorizes reads and writes before touching storage",
    async (error) => {
      authorize.mockRejectedValue(error);
      await expect(service.create({ memberIds })).rejects.toBe(error);
      await expect(service.resolve({ selection: token }, known)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.findForActor).not.toHaveBeenCalled();
      expect(repository.knownMemberIds).not.toHaveBeenCalled();
    },
  );
  it("canonicalizes duplicate IDs and rejects unavailable members without saving a partial group", async () => {
    await service.create({ memberIds: [memberIds[1], memberIds[0], memberIds[1]] });
    expect(records[0].memberIds).toEqual(memberIds.slice(0, 2));
    await expect(service.create({ memberIds: [memberIds[0], "missing"] })).rejects.toMatchObject({
      status: 400,
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
  it.each([
    { memberIds: [] },
    { memberIds: [""] },
    { memberIds: [...memberIds, "extra"] },
    { memberIds: [memberIds[0]], actorUserId: "spoof" },
  ])("rejects malformed selections", async (input) => {
    await expect(service.create(input)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("never broadens unknown, malformed, ambiguous or deleted-member tokens", async () => {
    expect(await service.resolve({ selection: token }, known)).toMatchObject({
      memberIds: [],
      invalid: true,
    });
    for (const query of [
      { selection: "bad" },
      { selection: [token, token] },
      { selection: token, memberId: memberIds[0] },
      { selection: token, user: memberIds[0] },
    ])
      expect(await service.resolve(query, known)).toMatchObject({ memberIds: [], invalid: true });
    await service.create({ memberIds: memberIds.slice(0, 2) });
    known.delete(memberIds[1]);
    expect(await service.resolve({ selection: token }, known)).toMatchObject({
      memberIds: [],
      invalid: true,
    });
  });
  it("retains small groups, explicit empty and all-member semantics", async () => {
    expect(await service.resolve({}, known)).toEqual({
      memberIds: null,
      invalid: false,
      selectionId: null,
    });
    expect(await service.resolve({ memberId: "" }, known)).toMatchObject({
      memberIds: [],
      invalid: false,
    });
    expect(await service.resolve({ memberId: memberIds[0] }, known)).toMatchObject({
      memberIds: [memberIds[0]],
      invalid: false,
    });
  });
});
