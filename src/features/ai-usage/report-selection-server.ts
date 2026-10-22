import { requireAdminUser } from "@/features/access/server";
import {
  ReportSelectionService,
  type ReportSelectionQuery,
} from "./application/report-selection-service";
import { DrizzleReportSelectionRepository } from "./infrastructure/report-selection-repository";

const service = new ReportSelectionService(
  new DrizzleReportSelectionRepository(),
  requireAdminUser,
);
export const createAiUsageReportSelection = (raw: unknown) => service.create(raw);
export const resolveAiUsageReportSelection = (
  query: ReportSelectionQuery,
  knownIds: ReadonlySet<string>,
) => service.resolve(query, knownIds);
