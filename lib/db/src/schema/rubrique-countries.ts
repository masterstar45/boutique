import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const rubriqueCountriesTable = pgTable(
  "rubrique_countries",
  {
    id: serial("id").primaryKey(),
    rubrique: text("rubrique").notNull(),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRubriqueCountry: unique("unique_rubrique_country").on(table.rubrique, table.country),
  }),
);
