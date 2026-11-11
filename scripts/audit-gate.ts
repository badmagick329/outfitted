import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/**
 * Dependency-vulnerability gate around `bun audit --json`.
 *
 * Bun 1.2.17's audit has no `--ignore` or `--audit-level` flag and ignores `--production`, so
 * the gate owns the exception policy: every advisory must match an unexpired entry in
 * `audit-exceptions.json`, and every entry must still match an advisory. Anything the gate
 * cannot interpret fails closed, because a parsing gap must never read as a clean tree.
 */

export const EXCEPTIONS_FILE = fileURLToPath(new URL("../audit-exceptions.json", import.meta.url));

/** Exceptions may run at most this far past the day the gate runs (about three months). */
export const MAX_EXCEPTION_DAYS = 92;

export type AuditRun = {
  /** Process exit code; null when the process could not start or was killed. */
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type GateResult = {
  exitCode: 0 | 1;
  report: string;
};

export type GateDependencies = {
  runAudit?: () => AuditRun;
  readExceptions?: () => string;
  /** UTC calendar day as YYYY-MM-DD. */
  today?: string;
};

// Bun prints an object keyed by package name; each advisory comes from the GitHub advisory
// database, so its URL ends in the GHSA ID the exceptions file is keyed on.
const advisorySchema = z.looseObject({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  severity: z.string(),
  vulnerable_versions: z.string(),
});
const auditSchema = z.record(z.string(), z.array(advisorySchema));

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((value) => toIsoDay(new Date(`${value}T00:00:00Z`)) === value, "is not a real date");

const exceptionSchema = z.strictObject({
  advisory: z.string().regex(/^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/, "must be a GHSA ID"),
  package: z.string().min(1),
  reason: z.string().trim().min(1),
  expires: isoDay,
});
const exceptionsFileSchema = z.strictObject({ exceptions: z.array(exceptionSchema) });

type AuditException = z.infer<typeof exceptionSchema>;

type Advisory = {
  package: string;
  ghsa: string | null;
  severity: string;
  title: string;
  url: string;
};

export function runAuditGate(dependencies: GateDependencies = {}): GateResult {
  const runAudit = dependencies.runAudit ?? runBunAudit;
  const readExceptions =
    dependencies.readExceptions ?? (() => readFileSync(EXCEPTIONS_FILE, "utf8"));
  const today = dependencies.today ?? toIsoDay(new Date());

  const exceptions = loadExceptions(readExceptions, today);
  if (!exceptions.ok) return fail(exceptions.errors);

  const advisories = parseAudit(runAudit());
  if (!advisories.ok) return fail(advisories.errors);

  return compare(advisories.value, exceptions.value, today);
}

function runBunAudit(): AuditRun {
  // Under Bun, execPath is the running Bun binary, so the audit uses the pinned version.
  const bun = process.versions.bun ? process.execPath : "bun";
  const result = spawnSync(bun, ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function loadExceptions(read: () => string, today: string): Parsed<AuditException[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(read());
  } catch (error) {
    return { ok: false, errors: [`Cannot read ${EXCEPTIONS_FILE}: ${describe(error)}`] };
  }

  const parsed = exceptionsFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) =>
          `Invalid exceptions file at ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }

  const errors: string[] = [];
  const latest = addDays(today, MAX_EXCEPTION_DAYS);
  const seen = new Set<string>();
  for (const exception of parsed.data.exceptions) {
    const key = exceptionKey(exception.package, exception.advisory);
    if (seen.has(key)) errors.push(`Duplicate exception for ${describeException(exception)}.`);
    seen.add(key);
    if (exception.expires > latest) {
      errors.push(
        `Exception ${describeException(exception)} expires ${exception.expires}, more than ` +
          `${MAX_EXCEPTION_DAYS} days out; set it to ${latest} or earlier.`,
      );
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: parsed.data.exceptions };
}

function parseAudit(run: AuditRun): Parsed<Advisory[]> {
  const stderr = run.stderr.trim();
  const detail = stderr ? `\n${stderr}` : "";
  if (run.error || run.exitCode === null) {
    return {
      ok: false,
      errors: [
        `bun audit did not run: ${run.error ? describe(run.error) : "no exit code"}${detail}`,
      ],
    };
  }
  // Exit 1 means either "vulnerabilities found" or a real failure (missing lockfile, network
  // error). Only a well-formed, non-empty advisory report distinguishes the first.
  if (run.exitCode !== 0 && run.exitCode !== 1) {
    return { ok: false, errors: [`bun audit failed with exit code ${run.exitCode}.${detail}`] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(run.stdout);
  } catch {
    return {
      ok: false,
      errors: [`bun audit exited ${run.exitCode} without valid JSON output.${detail}`],
    };
  }
  const parsed = auditSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: [
        `bun audit output has an unexpected shape: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ")}`,
      ],
    };
  }

  const advisories = Object.entries(parsed.data).flatMap(([name, entries]) =>
    entries.map((entry) => ({
      package: name,
      ghsa: entry.url.match(/\/advisories\/(GHSA(?:-[0-9a-z]{4}){3})\/?$/)?.[1] ?? null,
      severity: entry.severity,
      title: entry.title,
      url: entry.url,
    })),
  );
  const expectFindings = run.exitCode === 1;
  if (expectFindings !== advisories.length > 0) {
    return {
      ok: false,
      errors: [
        `bun audit exited ${run.exitCode} but reported ${advisories.length} advisories; ` +
          `treating the run as failed.${detail}`,
      ],
    };
  }
  return { ok: true, value: advisories };
}

function compare(advisories: Advisory[], exceptions: AuditException[], today: string): GateResult {
  const byKey = new Map(exceptions.map((e) => [exceptionKey(e.package, e.advisory), e]));
  const matched = new Set<string>();
  const errors: string[] = [];
  const notes: string[] = [];

  for (const advisory of advisories) {
    const label = `${advisory.package} ${advisory.ghsa ?? advisory.url} (${advisory.severity}): ${advisory.title}`;
    const key = advisory.ghsa ? exceptionKey(advisory.package, advisory.ghsa) : null;
    const exception = key ? byKey.get(key) : undefined;
    if (!key || !exception) {
      errors.push(`Unexcepted advisory ${label}\n    ${advisory.url}`);
      continue;
    }
    matched.add(key);
    if (exception.expires < today) {
      errors.push(
        `Expired exception for ${label}; it lapsed after ${exception.expires}. ` +
          `Fix the dependency or re-review and extend the exception.`,
      );
    } else {
      notes.push(`Excepted until ${exception.expires}: ${label}`);
    }
  }

  for (const [key, exception] of byKey) {
    if (!matched.has(key)) {
      errors.push(
        `Stale exception ${describeException(exception)}: bun audit no longer reports it. ` +
          `Remove it from audit-exceptions.json.`,
      );
    }
  }

  const summary = `bun audit reported ${advisories.length} advisories; ${exceptions.length} exceptions on file.`;
  if (errors.length > 0) return fail(errors, [summary, ...notes]);
  return { exitCode: 0, report: [summary, ...notes, "Audit gate passed."].join("\n") };
}

function fail(errors: string[], context: string[] = []): GateResult {
  return {
    exitCode: 1,
    report: [
      ...context,
      ...errors.map((error) => `FAIL ${error}`),
      "Audit gate failed. Upgrade or replace the affected package, or record a reviewed " +
        "exception in audit-exceptions.json (advisory, package, reason, expires within " +
        `${MAX_EXCEPTION_DAYS} days).`,
    ].join("\n"),
  };
}

function exceptionKey(packageName: string, ghsa: string): string {
  return `${packageName}\u0000${ghsa.toLowerCase()}`;
}

function describeException(exception: AuditException): string {
  return `${exception.package} ${exception.advisory}`;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDay(date);
}
