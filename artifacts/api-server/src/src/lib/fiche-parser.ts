import { logger } from "./logger";

// ── Schéma unifié d'une fiche client ──
export interface UnifiedFiche {
  id: string;
  nomComplet: string;
  email: string;
  telephone: string;
  adresse: string;
  iban: string;
  bic: string;
  metadonnees: Record<string, unknown>;
  formatOriginal: FicheFormat;
}

export type FicheFormat = "csv" | "json_simple" | "json_complex" | "text";

// ── Détection automatique du format ──
export function detectFormat(raw: string): FicheFormat {
  const trimmed = raw.trim();

  // JSON ? (commence par { ou [)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        // JSON complexe = imbriqué (a des sous-objets)
        const hasNested = Object.values(parsed).some(
          v => typeof v === "object" && v !== null && !Array.isArray(v),
        );
        return hasNested ? "json_complex" : "json_simple";
      }
    } catch {
      // Pas du JSON valide, on continue
    }
  }

  // CSV ? (contient des séparateurs ; ou , avec au moins 3 champs)
  const semicolonParts = trimmed.split(";");
  const commaParts = trimmed.split(",");
  if (semicolonParts.length >= 3) return "csv";
  if (commaParts.length >= 3 && !trimmed.startsWith("{")) return "csv";

  // Sinon c'est du texte structuré (clé:valeur ou ligne libre)
  return "text";
}

// ── Parsing CSV ──
function parseCsv(raw: string): Partial<UnifiedFiche> {
  // Détecte le séparateur (;  ou  ,)
  const sep = raw.includes(";") ? ";" : ",";
  const parts = raw.split(sep).map(s => s.trim());

  // Heuristique: cherche les champs par pattern
  const emailIdx = parts.findIndex(p => p.includes("@"));
  const ibanIdx = parts.findIndex(p => /^[A-Z]{2}\d{2}/.test(p));
  const phoneIdx = parts.findIndex(p => /^[\+0][\d\s\-\.]{7,}$/.test(p));
  const bicIdx = parts.findIndex(p => /^[A-Z]{4}[A-Z]{2}\w{2,5}$/.test(p));

  // Champs identifiés par position ou pattern
  return {
    nomComplet: parts[0] ?? "",
    email: emailIdx >= 0 ? parts[emailIdx] : (parts[1] ?? ""),
    telephone: phoneIdx >= 0 ? parts[phoneIdx] : (parts[2] ?? ""),
    adresse: parts[3] ?? "",
    iban: ibanIdx >= 0 ? parts[ibanIdx] : "",
    bic: bicIdx >= 0 ? parts[bicIdx] : "",
    metadonnees: { rawFields: parts },
  };
}

// ── Parsing JSON simple ──
function parseJsonSimple(raw: string): Partial<UnifiedFiche> {
  const obj = JSON.parse(raw);

  return {
    nomComplet: obj.nom_complet ?? obj.name ?? obj.nom ?? obj.full_name ?? obj.fullName ?? "",
    email: obj.email ?? obj.mail ?? obj.e_mail ?? "",
    telephone: obj.telephone ?? obj.phone ?? obj.tel ?? obj.mobile ?? "",
    adresse: obj.adresse ?? obj.address ?? obj.addr ?? "",
    iban: obj.iban ?? obj.IBAN ?? "",
    bic: obj.bic ?? obj.BIC ?? obj.swift ?? "",
    metadonnees: obj,
  };
}

// ── Parsing JSON complexe (imbriqué) ──
function parseJsonComplex(raw: string): Partial<UnifiedFiche> {
  const obj = JSON.parse(raw);

  // Aplatir les sous-objets courants
  const identity = obj.identity ?? obj.identite ?? obj.personal ?? obj.info ?? {};
  const bank = obj.bank ?? obj.banque ?? obj.banking ?? obj.compte ?? {};
  const contact = obj.contact ?? obj.coordonnees ?? {};

  return {
    nomComplet:
      identity.nom_complet ?? identity.name ?? identity.full_name
      ?? `${identity.prenom ?? identity.firstName ?? ""} ${identity.nom ?? identity.lastName ?? ""}`.trim()
      ?? obj.nom_complet ?? obj.name ?? "",
    email:
      contact.email ?? identity.email ?? obj.email ?? "",
    telephone:
      contact.telephone ?? contact.phone ?? contact.tel ?? identity.phone ?? obj.telephone ?? "",
    adresse:
      contact.adresse ?? contact.address ?? identity.adresse
      ?? ([contact.rue ?? "", contact.ville ?? "", contact.code_postal ?? ""].filter(Boolean).join(", ") || ""),
    iban: bank.iban ?? bank.IBAN ?? obj.iban ?? "",
    bic: bank.bic ?? bank.BIC ?? bank.swift ?? obj.bic ?? "",
    metadonnees: obj,
  };
}

// ── Parsing texte structuré (clé:valeur ou libre) ──
function parseText(raw: string): Partial<UnifiedFiche> {
  const lines = raw.split(/[|\n]/).map(s => s.trim()).filter(Boolean);
  const kv: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^([^:=]+)[=:](.+)$/);
    if (match) {
      kv[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  // Cherche les champs par clé courante
  const findKey = (...keys: string[]) =>
    keys.reduce<string>((found, k) => found || kv[k] || "", "");

  return {
    nomComplet: findKey("nom_complet", "nom complet", "name", "nom", "full_name", "fullname") || lines[0] || "",
    email: findKey("email", "mail", "e-mail", "e_mail"),
    telephone: findKey("telephone", "tel", "phone", "mobile", "téléphone"),
    adresse: findKey("adresse", "address", "addr", "rue"),
    iban: findKey("iban"),
    bic: findKey("bic", "swift"),
    metadonnees: { rawLines: lines, parsedKV: kv },
  };
}

// ── Fonction principale : parse une fiche brute → schéma unifié ──
export function parseFicheToUnified(rawData: string, forcedFormat?: FicheFormat): UnifiedFiche {
  const format = forcedFormat ?? detectFormat(rawData);
  let partial: Partial<UnifiedFiche>;

  switch (format) {
    case "csv":
      partial = parseCsv(rawData);
      break;
    case "json_simple":
      partial = parseJsonSimple(rawData);
      break;
    case "json_complex":
      partial = parseJsonComplex(rawData);
      break;
    case "text":
    default:
      partial = parseText(rawData);
      break;
  }

  return {
    id: crypto.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    nomComplet: partial.nomComplet ?? "",
    email: partial.email ?? "",
    telephone: partial.telephone ?? "",
    adresse: partial.adresse ?? "",
    iban: partial.iban ?? "",
    bic: partial.bic ?? "",
    metadonnees: partial.metadonnees ?? {},
    formatOriginal: format,
  };
}

// ── Validation du stock : combien de fiches disponibles ──
export function checkStockAvailability(
  totalStock: number,
  stockUsed: number,
  requestedQuantity: number,
): { available: boolean; count: number; message: string } {
  const remaining = Math.max(0, totalStock - stockUsed);

  if (remaining === 0) {
    return { available: false, count: 0, message: "Stock épuisé" };
  }
  if (remaining < requestedQuantity) {
    return {
      available: false,
      count: remaining,
      message: `Stock insuffisant : ${remaining} fiches disponibles sur ${requestedQuantity} demandées`,
    };
  }
  return {
    available: true,
    count: remaining,
    message: `Stock suffisant : ${remaining} fiches disponibles`,
  };
}

// ── Génération du fichier d'export dans différents formats ──
export function generateExportContent(
  rawLines: string[],
  outputFormat: "txt" | "csv" | "json",
): { content: string; contentType: string; extension: string } {
  switch (outputFormat) {
    case "json": {
      // Parse chaque ligne, convertit en unifié, exporte en JSON
      const fiches = rawLines.map(line => {
        try {
          return parseFicheToUnified(line);
        } catch {
          return { raw: line };
        }
      });
      return {
        content: JSON.stringify(fiches, null, 2),
        contentType: "application/json",
        extension: "json",
      };
    }

    case "csv": {
      // Parse chaque ligne, exporte en CSV avec en-têtes
      const headers = ["id", "nom_complet", "email", "telephone", "adresse", "iban", "bic"];
      const rows = rawLines.map(line => {
        try {
          const f = parseFicheToUnified(line);
          return [f.id, f.nomComplet, f.email, f.telephone, f.adresse, f.iban, f.bic]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(";");
        } catch {
          return `"${line.replace(/"/g, '""')}";;;;;;`;
        }
      });
      return {
        content: headers.join(";") + "\n" + rows.join("\n") + "\n",
        contentType: "text/csv",
        extension: "csv",
      };
    }

    case "txt":
    default:
      // Brut : une ligne = une fiche, tel quel
      return {
        content: rawLines.join("\n") + "\n",
        contentType: "text/plain",
        extension: "txt",
      };
  }
}

import crypto from "crypto";
