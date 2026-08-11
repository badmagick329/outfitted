CREATE TABLE "ignored_outfits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"suggestion_id" uuid NOT NULL,
	"selected_item_ids" jsonb NOT NULL,
	"item_signature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ignored_outfits" ADD CONSTRAINT "ignored_outfits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ignored_outfits" ADD CONSTRAINT "ignored_outfits_suggestion_id_outfit_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."outfit_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ignored_outfits_user_signature_idx" ON "ignored_outfits" USING btree ("user_id","item_signature");--> statement-breakpoint
CREATE UNIQUE INDEX "ignored_outfits_user_suggestion_idx" ON "ignored_outfits" USING btree ("user_id","suggestion_id");