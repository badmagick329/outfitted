import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), provider: text("provider").notNull(), providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"), access_token: text("access_token"), expires_at: integer("expires_at"),
  token_type: text("token_type"), scope: text("scope"), id_token: text("id_token"), session_state: text("session_state"),
}, (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(), token: text("token").notNull(), expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => [primaryKey({ columns: [table.identifier, table.token] })]);

export const wardrobeItems = pgTable("wardrobe_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull().default("New garment"),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  primaryColor: varchar("primary_color", { length: 64 }),
  secondaryColors: jsonb("secondary_colors").$type<string[]>().notNull().default([]),
  material: varchar("material", { length: 128 }), fit: varchar("fit", { length: 128 }),
  styleTags: jsonb("style_tags").$type<string[]>().notNull().default([]),
  seasons: jsonb("seasons").$type<string[]>().notNull().default([]),
  formality: varchar("formality", { length: 64 }),
  confidence: jsonb("confidence").$type<Array<{ field: string; level: "high" | "medium" | "low"; note: string }>>().notNull().default([]),
  analysisStatus: varchar("analysis_status", { length: 24 }).notNull().default("pending"),
  analysisError: text("analysis_error"), archivedAt: timestamp("archived_at", { withTimezone: true }),
  metadataEditedAt: timestamp("metadata_edited_at", { withTimezone: true }),
  ...timestamps,
});

export const itemPhotos = pgTable("item_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => wardrobeItems.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(), width: integer("width").notNull(), height: integer("height").notNull(),
  mimeType: varchar("mime_type", { length: 64 }).notNull().default("image/webp"), position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const outfitSuggestions = pgTable("outfit_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  request: text("request").notNull(), selectedItemIds: jsonb("selected_item_ids").$type<string[]>().notNull().default([]),
  recommendation: text("recommendation").notNull(), rationale: text("rationale"),
  ...timestamps,
});

export const savedOutfits = pgTable("saved_outfits", {
  id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  suggestionId: uuid("suggestion_id").notNull().references(() => outfitSuggestions.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
