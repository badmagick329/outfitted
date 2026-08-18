CREATE TABLE "user_feature_grants" (
	"user_id" text NOT NULL,
	"feature_key" varchar(64) NOT NULL,
	"remaining_uses" integer DEFAULT 0 NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_feature_grants_user_id_feature_key_pk" PRIMARY KEY("user_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "user_feature_grants" ADD CONSTRAINT "user_feature_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_grants" ADD CONSTRAINT "user_feature_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;