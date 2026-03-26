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
  // Format 1: FICHE blocks separated by ====
  if (text.includes("FICHE")) {
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

  // Format 2: Key:Value pairs with blank line separator between records
  const blocksByBlankLine = text.split(/\n\s*\n/).filter(b => b.trim());
  if (blocksByBlankLine.length > 1) {
    const rows: FicheData[] = [];
    for (const block of blocksByBlankLine) {
      const obj: FicheData = {};
      const lines = block.split(/\r?\n/).filter(l => l.trim());
      
      for (const line of lines) {
        if (line.includes(":")) {
          const [key, ...valueParts] = line.split(":");
          obj[key.trim()] = valueParts.join(":").trim();
        } else if (line.includes("=")) {
          const [key, ...valueParts] = line.split("=");
          obj[key.trim()] = valueParts.join("=").trim();
        } else if (line.includes("|")) {
          const [key, value] = line.split("|");
          if (key && value) {
            obj[key.trim()] = value.trim();
          }
        }
      }
      if (Object.keys(obj).length > 0) {
        rows.push(obj);
      }
    }
    return rows;
  }

  // Format 3: Detect if it's multiple records by counting key patterns
  const allLines = text.split(/\r?\n/);
  const keyPatterns: { [key: string]: number } = {};
  
  for (const line of allLines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^:=|]+)/);
    if (match) {
      const key = match[1].trim();
      keyPatterns[key] = (keyPatterns[key] || 0) + 1;
    }
  }

  // If we see each key appearing 2+ times, it's likely multiple records
  const keyOccurrences = Object.values(keyPatterns);
  const maxOccurrences = Math.max(...keyOccurrences, 0);
  const estimatedRecords = maxOccurrences > 1 ? maxOccurrences : 1;

  if (estimatedRecords > 1) {
    // Try to split into chunks
    const rows: FicheData[] = [];
    let currentObj: FicheData = {};
    let keyCount = 0;
    const maxKeysPerRecord = Object.keys(keyPatterns).length / estimatedRecords;

    for (const line of allLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (Object.keys(currentObj).length > 0) {
          rows.push(currentObj);
          currentObj = {};
          keyCount = 0;
        }
        continue;
      }

      if (line.includes(":")) {
        const [key, ...valueParts] = line.split(":");
        const keyTrim = key.trim();
        
        if (currentObj[keyTrim] !== undefined && keyCount > maxKeysPerRecord) {
          // We've seen this key before in this record, start a new one
          rows.push(currentObj);
          currentObj = {};
          keyCount = 0;
        }
        
        currentObj[keyTrim] = valueParts.join(":").trim();
        keyCount++;
      } else if (line.includes("=")) {
        const [key, ...valueParts] = line.split("=");
        const keyTrim = key.trim();
        
        if (currentObj[keyTrim] !== undefined && keyCount > maxKeysPerRecord) {
          rows.push(currentObj);
          currentObj = {};
          keyCount = 0;
        }
        
        currentObj[keyTrim] = valueParts.join("=").trim();
        keyCount++;
      } else if (line.includes("|")) {
        const [key, value] = line.split("|");
        if (key && value) {
          const keyTrim = key.trim();
          if (currentObj[keyTrim] !== undefined && keyCount > maxKeysPerRecord) {
            rows.push(currentObj);
            currentObj = {};
            keyCount = 0;
          }
          currentObj[keyTrim] = value.trim();
          keyCount++;
        }
      }
    }

    if (Object.keys(currentObj).length > 0) {
      rows.push(currentObj);
    }

    if (rows.length > 0) return rows;
  }

  // Format 4: Single record - all lines are Key:Value or Key=Value
  const obj: FicheData = {};
  
  for (const line of allLines) {
    if (!line.trim()) continue;
    
    if (line.includes(":")) {
      const [key, ...valueParts] = line.split(":");
      obj[key.trim()] = valueParts.join(":").trim();
    } else if (line.includes("=")) {
      const [key, ...valueParts] = line.split("=");
      obj[key.trim()] = valueParts.join("=").trim();
    } else if (line.includes("|")) {
      const [key, value] = line.split("|");
      if (key && value) {
        obj[key.trim()] = value.trim();
      }
    }
  }

  if (Object.keys(obj).length > 0) {
    return [obj];
  }

  return [];
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