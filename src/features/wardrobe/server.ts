import { ai } from "@/lib/ai";
import { aiUsageRecorder } from "@/features/ai-usage/server";
import { enqueueAnalysis } from "@/lib/jobs";
import { storage } from "@/lib/storage";
import { WardrobeService } from "./application/wardrobe-service";
import { DrizzleWardrobeRepository } from "./infrastructure/drizzle-wardrobe-repository";

export const wardrobeService = new WardrobeService({
  repository: new DrizzleWardrobeRepository(),
  storage,
  jobs: { enqueueAnalysis },
  ai,
  usageRecorder: aiUsageRecorder,
});
