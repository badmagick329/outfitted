CREATE TABLE "access_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"previous_access_status" varchar(16) NOT NULL,
	"next_access_status" varchar(16) NOT NULL,
	"previous_feature_tier" varchar(16) NOT NULL,
	"next_feature_tier" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wardrobe_items" ALTER COLUMN "analysis_status" SET DEFAULT 'not_requested';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_status" varchar(16) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "feature_tier" varchar(16) DEFAULT 'inventory' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_audit_events" ADD CONSTRAINT "access_audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit_events" ADD CONSTRAINT "access_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;