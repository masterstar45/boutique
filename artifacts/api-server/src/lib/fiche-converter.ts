/**
 * Converts various file formats (JSON, CSV, TXT) to FICHE CLIENT format
 */

interface FicheData {
  nom?: string;
  name?: string;
  prénom?: string;
  firstname?: string;
  dateNaissance?: string;
  "date de naissance"?: string;
  birthDate?: string;
  adresse?: string;
  address?: string;
  codePostal?: string;
  "code postal"?: string;
  zipCode?: string;
  ville?: string;
  city?: string;
  téléphone?: string;
  phone?: string;
  email?: string;
  iban?: string;
  bic?: string;
  [key: string]: any;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");
}

function extractField(obj: FicheData, ...possibleKeys: string[]): string {
  const normalized = possibleKeys.map(normalizeKey);
  for (const key in obj) {
    if (normalized.includes(normalizeKey(key))) {
      const val = obj[key];
      return val ? String(val).trim() : "";
    }
  }
  return "";
}

function parseJSON(text: string): FicheData[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return [data];
  return [];
}

function parseCSV(text: string): FicheData[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const rows: FicheData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const obj: FicheData = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      obj[headers[j]] = values[j];
    }
    rows.push(obj);
  }

  return rows;
}

function parseTXT(text: string): FicheData[] {
  const blocks = text.split(/={10,}/).filter(b => b.trim());
  const rows: FicheData[] = [];

  for (const block of blocks) {
    const obj: FicheData = {};
    const lines = block.split(/\r?\n/).filter(l => l.trim());

    for (const line of lines) {
      if (!line.includes(":")) continue;
      const [key, ...valueParts] = line.split(":");
      obj[key.trim()] = valueParts.join(":").trim();
    }

    if (Object.keys(obj).length > 0) {
      rows.push(obj);
    }
  }

  return rows;
}

function parseFile(content: string): FicheData[] {
  content = content.trim();

  // Try JSON first
  if (content.startsWith("{") || content.startsWith("[")) {
    try {
      return parseJSON(content);
    } catch {}
  }

  // Try TXT format (contains ===== FICHE =====)
  if (content.includes("FICHE")) {
    const result = parseTXT(content);
    if (result.length > 0) return result;
  }

  // Try CSV
  if (content.includes(",")) {
    try {
      const result = parseCSV(content);
      if (result.length > 0) return result;
    } catch {}
  }

  // Fallback: each line is a JSON object
  try {
    const rows: FicheData[] = [];
    for (const line of content.split(/\r?\n/)) {
      if (line.trim()) {
        rows.push(JSON.parse(line));
      }
    }
    if (rows.length > 0) return rows;
  } catch {}

  return [];
}

export function convertToFicheFormat(fileContent: string): string {
  const rows = parseFile(fileContent);
  if (rows.length === 0) return fileContent;

  const ficheLines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    ficheLines.push(`===== FICHE ${i + 1} =====`);
    ficheLines.push(`Nom: ${extractField(row, "nom", "name", "lastName")}`);
    ficheLines.push(`Prénom: ${extractField(row, "prénom", "firstname", "firstName")}`);
    ficheLines.push(`Date de naissance: ${extractField(row, "dateNaissance", "date de naissance", "birthDate")}`);
    ficheLines.push(`Adresse: ${extractField(row, "adresse", "address")}`);
    ficheLines.push(`Code postal: ${extractField(row, "codePostal", "code postal", "zipCode")}`);
    ficheLines.push(`Ville: ${extractField(row, "ville", "city")}`);
    ficheLines.push(`Téléphone: ${extractField(row, "téléphone", "phone", "telephone")}`);
    ficheLines.push(`Email: ${extractField(row, "email", "e-mail", "mail")}`);
    ficheLines.push(`IBAN: ${extractField(row, "iban")}`);
    ficheLines.push(`BIC: ${extractField(row, "bic")}`);
    ficheLines.push("=================== ");
  }

  return ficheLines.join("\n");
}