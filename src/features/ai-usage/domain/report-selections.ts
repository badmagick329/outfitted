export type SavedReportSelection = {
  id: string;
  actorUserId: string;
  memberIds: string[];
  createdAt: Date;
};

export interface ReportSelectionRepository {
  knownMemberIds(memberIds: string[]): Promise<string[]>;
  create(actorUserId: string, memberIds: string[]): Promise<SavedReportSelection>;
  findForActor(id: string, actorUserId: string): Promise<SavedReportSelection | null>;
}
