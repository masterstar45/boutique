import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const fileStorageTable = pgTable("file_storage", {
  id: serial("id").primaryKey(),
  objectId: text("object_id").notNull().unique(),
  data: text("data").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});