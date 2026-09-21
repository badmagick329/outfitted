import { conflict, forbidden, notFound } from "@/shared/application-error";
import type { AccessStatus } from "@/features/access/contracts";
import type { ResolveAiAccessRequestInput } from "../domain/contracts";
import type { AiAccessRequestRecord, AiAccessRequestRepository } from "../domain/repository";

type AccountAccess = {
  accessStatus: AccessStatus;
  canUseAi: boolean;
};

type Dependencies = {
  repository: AiAccessRequestRepository;
  access: { getById(userId: string): Promise<AccountAccess | null> };
};

/**
 * Coordinates AI access requests. It deliberately depends on nothing AI-related:
 * requesting access is an entitlement change, never a reason to queue model work.
 */
export class AiAccessService {
  constructor(private readonly dependencies: Dependencies) {}

  getLatestForUser(userId: string): Promise<AiAccessRequestRecord | null> {
    return this.dependencies.repository.findLatestForUser(userId);
  }

  listPending() {
    return this.dependencies.repository.listPending();
  }

  async submit(userId: string): Promise<AiAccessRequestRecord> {
    const account = await this.dependencies.access.getById(userId);
    if (!account) throw notFound("User not found");
    if (account.accessStatus !== "active")
      throw forbidden("Your account must be active before requesting AI access.");
    if (account.canUseAi) throw conflict("AI features are already enabled for your account.");

    const { request, created } = await this.dependencies.repository.createPending(userId);
    if (!created) throw conflict("You already have a pending AI access request.");
    return request;
  }

  async resolve(actorUserId: string, requestId: string, input: ResolveAiAccessRequestInput) {
    const outcome =
      input.decision === "approved"
        ? await this.dependencies.repository.approve(requestId, actorUserId)
        : await this.dependencies.repository.decline(requestId, actorUserId);
    if (outcome === "not_pending") throw conflict("This request has already been resolved.");
  }
}
