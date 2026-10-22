CREATE TABLE "ai_usage_report_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"member_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_report_selections_nonempty" CHECK (cardinality("ai_usage_report_selections"."member_ids") > 0)
);
--> statement-breakpoint
ALTER TABLE "ai_usage_report_selections" ADD CONSTRAINT "ai_usage_report_selections_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_report_selections_actor_idx" ON "ai_usage_report_selections" USING btree ("actor_user_id");