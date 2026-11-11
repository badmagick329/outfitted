import { describe, expect, it } from "vitest";
import { runAuditGate, type AuditRun } from "./audit-gate";

const TODAY = "2026-11-11";

const minimatchAdvisory = {
  id: 1244623,
  url: "https://github.com/advisories/GHSA-g3hv-75wg-m249",
  title: "minimatch has potential denial of service via globparts amplification",
  severity: "moderate",
  vulnerable_versions: ">=7.0.0 <11.0.1",
  cwe: ["CWE-405"],
  cvss: { score: 0, vectorString: null },
};

const deepmergeAdvisory = {
  id: 1243505,
  url: "https://github.com/advisories/GHSA-gcqx-w48m-w2h4",
  title: "deepmerge mergeObject() allows prototype poisoning of returned objects",
  severity: "low",
  vulnerable_versions: ">=4.2.0 <=4.3.1",
  cwe: ["CWE-1321"],
  cvss: { score: 5.3, vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N" },
};

// Shape captured from Bun 1.2.17's `bun audit --json` against this repository.
const currentAudit: AuditRun = {
  exitCode: 1,
  stdout: JSON.stringify({ deepmerge: [deepmergeAdvisory], minimatch: [minimatchAdvisory] }),
  stderr: "bun audit v1.2.17 (282dda62)",
};

const minimatchException = {
  advisory: "GHSA-g3hv-75wg-m249",
  package: "minimatch",
  reason: "Development only; dependents pin ^10.",
  expires: "2027-02-11",
};

const deepmergeException = {
  advisory: "GHSA-gcqx-w48m-w2h4",
  package: "deepmerge",
  reason: "Development only; no patched release.",
  expires: "2027-02-11",
};

function gate(audit: AuditRun, exceptions: unknown[], today = TODAY) {
  return runAuditGate({
    runAudit: () => audit,
    readExceptions: () => JSON.stringify({ exceptions }),
    today,
  });
}

describe("runAuditGate", () => {
  it("passes when every advisory has a current exception", () => {
    const result = gate(currentAudit, [minimatchException, deepmergeException]);

    expect(result.exitCode).toBe(0);
    expect(result.report).toContain("Audit gate passed.");
  });

  it("passes a clean tree with no exceptions", () => {
    const result = gate({ exitCode: 0, stdout: "{}", stderr: "" }, []);

    expect(result.exitCode).toBe(0);
  });

  it("fails on an advisory without an exception", () => {
    const result = gate(currentAudit, [minimatchException]);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Unexcepted advisory deepmerge GHSA-gcqx-w48m-w2h4");
  });

  it("does not let an exception for one package cover another", () => {
    const result = gate(currentAudit, [
      minimatchException,
      { ...deepmergeException, package: "lodash" },
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Unexcepted advisory deepmerge");
  });

  it("fails once an exception has expired", () => {
    const result = gate(
      currentAudit,
      [minimatchException, { ...deepmergeException, expires: "2026-11-10" }],
      TODAY,
    );

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Expired exception for deepmerge GHSA-gcqx-w48m-w2h4");
  });

  it("still accepts an exception on its expiry day", () => {
    const result = gate(currentAudit, [minimatchException, deepmergeException], "2027-02-11");

    expect(result.exitCode).toBe(0);
  });

  it("fails on a stale exception that matches no advisory", () => {
    const audit: AuditRun = {
      exitCode: 1,
      stdout: JSON.stringify({ minimatch: [minimatchAdvisory] }),
      stderr: "",
    };
    const result = gate(audit, [minimatchException, deepmergeException]);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Stale exception deepmerge GHSA-gcqx-w48m-w2h4");
  });

  it("fails on an exception that runs more than about three months out", () => {
    const result = gate(currentAudit, [
      minimatchException,
      { ...deepmergeException, expires: "2027-06-01" },
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("more than 92 days out");
  });

  it("fails on an exception without a reason", () => {
    const result = gate(currentAudit, [minimatchException, { ...deepmergeException, reason: " " }]);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("exceptions.1.reason");
  });

  it.each([
    ["non-JSON output", { exitCode: 1, stdout: "error: Lockfile not found", stderr: "" }],
    ["empty output", { exitCode: 1, stdout: "", stderr: "error: Lockfile not found" }],
    ["an unexpected JSON shape", { exitCode: 1, stdout: '{"minimatch":{"id":1}}', stderr: "" }],
    ["an advisory missing fields", { exitCode: 1, stdout: '{"minimatch":[{"id":1}]}', stderr: "" }],
    ["exit 1 with no advisories", { exitCode: 1, stdout: "{}", stderr: "network error" }],
    ["an unknown exit code", { exitCode: 2, stdout: "{}", stderr: "" }],
    [
      "a process that never started",
      { exitCode: null, stdout: "", stderr: "", error: new Error("spawn bun ENOENT") },
    ],
  ] satisfies [string, AuditRun][])("fails closed on %s", (_label, audit) => {
    const result = gate(audit, []);

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Audit gate failed.");
  });

  it("fails on a malformed exceptions file", () => {
    const result = runAuditGate({
      runAudit: () => currentAudit,
      readExceptions: () => "{ not json",
      today: TODAY,
    });

    expect(result.exitCode).toBe(1);
    expect(result.report).toContain("Cannot read");
  });
});
