ALTER TABLE "wardrobe_items" ALTER COLUMN "name" SET DEFAULT '';
--> statement-breakpoint
UPDATE "wardrobe_items" SET "name" = '' WHERE "name" = 'New garment';
