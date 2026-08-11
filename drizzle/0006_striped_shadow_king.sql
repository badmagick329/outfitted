CREATE TABLE "user_style_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"general_style" text DEFAULT '' NOT NULL,
	"preferences" text DEFAULT '' NOT NULL,
	"avoidances" text DEFAULT '' NOT NULL,
	"occasion_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_style_profiles" ADD CONSTRAINT "user_style_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;