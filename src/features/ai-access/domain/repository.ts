import type { AiAccessRequestStatus } from "./contracts";

export type AiAccessRequestRecord = {
  id: string;
  userId: string;
  status: AiAccessRequestStatus;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PendingAiAccessRequest = AiAccessRequestRecord & {
  userName: string | null;
  userEmail: string;
};

export type AiAccessRequestResolution = "resolved" | "not_pending";

/**
 * Owns the persistence of AI access requests. Resolution is a single atomic unit:
 * `approve` must set the member's feature tier and append the access audit event in
 * the same transaction that flips the request, otherwise a request could be marked
 * resolved without the entitlement it represents.
 */
export interface AiAccessRequestRepository {
  findLatestForUser(userId: string): Promise<AiAccessRequestRecord | null>;
  createPending(userId: string): Promise<{ request: AiAccessRequestRecord; created: boolean }>;
  listPending(): Promise<PendingAiAccessRequest[]>;
  approve(requestId: string, actorUserId: string): Promise<AiAccessRequestResolution>;
  decline(requestId: string, actorUserId: string): Promise<AiAccessRequestResolution>;
}
