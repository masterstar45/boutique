import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const botButtonsTable = pgTable("bot_buttons", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  isWebApp: boolean("is_web_app").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BotButton = typeof botButtonsTable.$inferSelect;
