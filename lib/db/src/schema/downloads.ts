import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const downloadsTable = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  orderId: integer("order_id").notNull(),
  token: text("token").notNull().unique(),
  downloadCount: integer("download_count").notNull().default(0),
  maxDownloads: integer("max_downloads").notNull().default(5),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastDownloadedAt: timestamp("last_downloaded_at", { withTimezone: true }),
  generatedFileUrl: text("generated_file_url"),
  generatedFileName: text("generated_file_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDownloadSchema = createInsertSchema(downloadsTable).omit({ id: true, createdAt: true });
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloadsTable.$inferSelect;
