import { after } from "next/server";
import { ai } from "@/lib/ai";
import { notificationService } from "@/features/notifications/server";
import { enqueueAnalysis } from "@/lib/jobs";
import { storage } from "@/lib/storage";
import { WardrobeService } from "./application/wardrobe-service";
import { DrizzleWardrobeRepository } from "./infrastructure/drizzle-wardrobe-repository";

export const wardrobeService = new WardrobeService({
  repository: new DrizzleWardrobeRepository(),
  storage,
  jobs: { enqueueAnalysis },
  notifications: notificationService,
  schedule: (task) => after(task),
  ai,
});
