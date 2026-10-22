CREATE TABLE "ai_budget_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(16) NOT NULL,
	"target_user_id" text,
	"actor_user_id" text NOT NULL,
	"previous_limit_microusd" integer,
	"next_limit_microusd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budget_audit_events_scope" CHECK (("ai_budget_audit_events"."scope" = 'default' and "ai_budget_audit_events"."target_user_id" is null and "ai_budget_audit_events"."previous_limit_microusd" is not null and "ai_budget_audit_events"."next_limit_microusd" is not null) or ("ai_budget_audit_events"."scope" = 'member' and "ai_budget_audit_events"."target_user_id" is not null)),
	CONSTRAINT "ai_budget_audit_events_nonnegative" CHECK (("ai_budget_audit_events"."previous_limit_microusd" is null or "ai_budget_audit_events"."previous_limit_microusd" >= 0) and ("ai_budget_audit_events"."next_limit_microusd" is null or "ai_budget_audit_events"."next_limit_microusd" >= 0))
);
--> statement-breakpoint
CREATE TABLE "ai_budget_overrides" (
	"user_id" text PRIMARY KEY NOT NULL,
	"limit_microusd" integer NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budget_overrides_nonnegative" CHECK ("ai_budget_overrides"."limit_microusd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_budget_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"operation" varchar(32) NOT NULL,
	"model" varchar(64) NOT NULL,
	"period_key" varchar(7) NOT NULL,
	"period_starts_at" timestamp with time zone NOT NULL,
	"period_ends_at" timestamp with time zone NOT NULL,
	"amount_microusd" integer NOT NULL,
	"actual_cost_microusd" integer,
	"status" varchar(16) DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budget_reservations_amount" CHECK ("ai_budget_reservations"."amount_microusd" > 0),
	CONSTRAINT "ai_budget_reservations_actual_cost" CHECK ("ai_budget_reservations"."actual_cost_microusd" >= 0),
	CONSTRAINT "ai_budget_reservations_period" CHECK ("ai_budget_reservations"."period_ends_at" > "ai_budget_reservations"."period_starts_at"),
	CONSTRAINT "ai_budget_reservations_status" CHECK ("ai_budget_reservations"."status" in ('reserved', 'dispatched', 'uncertain', 'settled', 'released')),
	CONSTRAINT "ai_budget_reservations_settled_cost" CHECK (("ai_budget_reservations"."status" = 'settled') = ("ai_budget_reservations"."actual_cost_microusd" is not null))
);
--> statement-breakpoint
CREATE TABLE "ai_budget_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"default_limit_microusd" integer DEFAULT 5000000 NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budget_settings_singleton" CHECK ("ai_budget_settings"."id" = 'singleton'),
	CONSTRAINT "ai_budget_settings_nonnegative" CHECK ("ai_budget_settings"."default_limit_microusd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "feature_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feature_key" varchar(64) NOT NULL,
	"pending_item_ids" uuid[] NOT NULL,
	"grant_generation" uuid NOT NULL,
	"admitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD COLUMN "budget_reservation_id" uuid;--> statement-breakpoint
ALTER TABLE "user_feature_grants" ADD COLUMN "generation" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_budget_audit_events" ADD CONSTRAINT "ai_budget_audit_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_audit_events" ADD CONSTRAINT "ai_budget_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_overrides" ADD CONSTRAINT "ai_budget_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_overrides" ADD CONSTRAINT "ai_budget_overrides_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_settings" ADD CONSTRAINT "ai_budget_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_runs" ADD CONSTRAINT "feature_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_budget_audit_events_created_at_idx" ON "ai_budget_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_budget_reservations_user_period_idx" ON "ai_budget_reservations" USING btree ("user_id","period_key");--> statement-breakpoint
CREATE INDEX "ai_budget_reservations_status_updated_idx" ON "ai_budget_reservations" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "feature_runs_unfinished_idx" ON "feature_runs" USING btree ("created_at") WHERE "feature_runs"."completed_at" is null;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_budget_reservation_id_ai_budget_reservations_id_fk" FOREIGN KEY ("budget_reservation_id") REFERENCES "public"."ai_budget_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_budget_reservation_id_unique" UNIQUE("budget_reservation_id");
--> statement-breakpoint
INSERT INTO "ai_budget_settings" ("id", "default_limit_microusd") VALUES ('singleton', 5000000);
