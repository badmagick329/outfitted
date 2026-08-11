CREATE TABLE "wardrobe_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"report" jsonb,
	"source_signature" varchar(64) NOT NULL,
	"item_count" integer NOT NULL,
	"used_style_profile" boolean DEFAULT false NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wardrobe_reviews" ADD CONSTRAINT "wardrobe_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wardrobe_reviews_user_created_at_idx" ON "wardrobe_reviews" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wardrobe_reviews_one_active_user_idx" ON "wardrobe_reviews" USING btree ("user_id") WHERE "wardrobe_reviews"."status" in ('pending', 'processing');