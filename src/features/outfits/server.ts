import { ai } from "@/lib/ai";
import { OutfitService } from "./application/outfit-service";
import { DrizzleOutfitRepository } from "./infrastructure/drizzle-outfit-repository";

export const outfitService = new OutfitService(new DrizzleOutfitRepository(), ai);
