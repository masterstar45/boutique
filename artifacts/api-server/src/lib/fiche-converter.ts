/**
 * Converts various file formats to FICHE CLIENT format.
 * Rule: 1 ligne = 1 fiche. Each non-empty line in the imported file
 * represents a single fiche client record.
 */

import { parseFicheToUnified, type UnifiedFiche } from "./fiche-parser";

function formatFicheBlock(fiche: UnifiedFiche, index: number): string {
  const lines: string[] = [];
  lines.push(`===== FICHE ${index + 1} =====`);
  if (fiche.nomComplet) lines.push(`Nom: ${fiche.nomComplet}`);
  if (fiche.dateNaissance) lines.push(`Date de naissance: ${fiche.dateNaissance}`);
  if (fiche.email) lines.push(`Email: ${fiche.email}`);
  if (fiche.telephone) lines.push(`Téléphone: ${fiche.telephone}`);
  if (fiche.adresse) lines.push(`Adresse: ${fiche.adresse}`);
  if (fiche.iban) lines.push(`IBAN: ${fiche.iban}`);
  if (fiche.bic) lines.push(`BIC: ${fiche.bic}`);

  const extraKeys = Object.keys(fiche.metadonnees).filter(
    k => !["rawFields", "rawLines", "parsedKV"].includes(k),
  );
  for (const key of extraKeys) {
    const val = fiche.metadonnees[key];
    if (val !== null && val !== undefined && typeof val !== "object") {
      lines.push(`${key}: ${val}`);
    }
  }

  lines.push("===================");
  return lines.join("\n");
}

/**
 * Converts any fiche-client file to the standard FICHE CLIENT format.
 * Each non-empty line in the source file is treated as 1 fiche record.
 * The line can be CSV (semicolons or commas), JSON, or key:value text — 
 * `parseFicheToUnified` auto-detects per line.
 */
export function convertToFicheFormat(fileContent: string): string {
  const rawLines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) return fileContent;

  const fiches: UnifiedFiche[] = [];

  for (const line of rawLines) {
    try {
      fiches.push(parseFicheToUnified(line));
    } catch {
      fiches.push({
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nomComplet: line.trim(),
        email: "",
        telephone: "",
        adresse: "",
        iban: "",
        bic: "",
        metadonnees: { raw: line },
        formatOriginal: "text",
      });
    }
  }

  return fiches.map((f, i) => formatFicheBlock(f, i)).join("\n\n") + "\n";
}
