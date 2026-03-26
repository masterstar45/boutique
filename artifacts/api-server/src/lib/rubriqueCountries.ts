import { db, rubriqueCountriesTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";

export const VALID_RUBRIQUES = ["numlist", "maillist", "fiche-client"] as const;
export type RubriqueType = (typeof VALID_RUBRIQUES)[number];

export function isValidRubrique(value: string): value is RubriqueType {
  return VALID_RUBRIQUES.includes(value as RubriqueType);
}

export async function getAllRubriqueCountries(): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ rubrique: rubriqueCountriesTable.rubrique, country: rubriqueCountriesTable.country })
    .from(rubriqueCountriesTable)
    .orderBy(asc(rubriqueCountriesTable.rubrique), asc(rubriqueCountriesTable.country));

  const map: Record<string, string[]> = {};
  for (const rubrique of VALID_RUBRIQUES) {
    map[rubrique] = [];
  }

  for (const row of rows) {
    if (!map[row.rubrique]) map[row.rubrique] = [];
    map[row.rubrique].push(row.country);
  }

  return map;
}

export async function getRubriqueCountries(rubrique: RubriqueType): Promise<string[]> {
  const rows = await db
    .select({ country: rubriqueCountriesTable.country })
    .from(rubriqueCountriesTable)
    .where(eq(rubriqueCountriesTable.rubrique, rubrique))
    .orderBy(asc(rubriqueCountriesTable.country));

  return rows.map((row) => row.country);
}

export async function setRubriqueCountries(rubrique: RubriqueType, countries: string[]): Promise<string[]> {
  const uniqueCountries = Array.from(
    new Set(
      countries
        .map((country) => String(country || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  // Delete existing countries for this rubrique
  await db.delete(rubriqueCountriesTable).where(eq(rubriqueCountriesTable.rubrique, rubrique));

  // Insert new countries
  if (uniqueCountries.length > 0) {
    await db.insert(rubriqueCountriesTable).values(
      uniqueCountries.map((country) => ({
        rubrique,
        country,
      })),
    );
  }

  return getRubriqueCountries(rubrique);
}
