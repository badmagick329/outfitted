CREATE TABLE "ai_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"resolved_by_user_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_access_requests" ADD CONSTRAINT "ai_access_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_access_requests" ADD CONSTRAINT "ai_access_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_access_requests_one_pending_user_idx" ON "ai_access_requests" USING btree ("user_id") WHERE "ai_access_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "ai_access_requests_user_created_at_idx" ON "ai_access_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_access_requests_status_idx" ON "ai_access_requests" USING btree ("status");