import { getUserAccessById } from "@/features/access/server";
import { AiAccessService } from "./application/ai-access-service";
import { DrizzleAiAccessRequestRepository } from "./infrastructure/drizzle-ai-access-repository";

export const aiAccessService = new AiAccessService({
  repository: new DrizzleAiAccessRequestRepository(),
  access: { getById: getUserAccessById },
});
