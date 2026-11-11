import { runAuditGate } from "./audit-gate";

const result = runAuditGate();
(result.exitCode === 0 ? console.log : console.error)(result.report);
process.exitCode = result.exitCode;
