import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES_ORDER = [
  "categories",
  "users",
  "products",
  "orders",
  "order_items",
  "payments",
  "deposits",
  "downloads",
  "promo_codes",
  "affiliates",
  "rubrique_countries",
  "bot_buttons",
  "file_storage",
];

async function restore() {
  const backupDir = path.resolve(process.cwd(), "backups");

  const backupArg = process.argv[2];
  let backupFile: string;

  if (backupArg) {
    backupFile = path.resolve(backupArg);
  } else {
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error("No backup files found in ./backups/");
      process.exit(1);
    }

    backupFile = path.join(backupDir, files[0]);
    console.log(`Using latest backup: ${files[0]}`);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const data: Record<string, any[]> = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reversedTables = [...TABLES_ORDER].reverse();
    for (const table of reversedTables) {
      await client.query(`DELETE FROM "${table}"`);
    }

    let totalRows = 0;

    for (const table of TABLES_ORDER) {
      const rows = data[table];
      if (!rows || rows.length === 0) {
        console.log(`  - ${table}: 0 rows (skipped)`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(", ");

      for (const row of rows) {
        const values = columns.map((_, i) => `$${i + 1}`).join(", ");
        const params = columns.map((c) => row[c]);
        await client.query(
          `INSERT INTO "${table}" (${colNames}) VALUES (${values})`,
          params,
        );
      }

      const maxIdResult = await client.query(
        `SELECT MAX(id) as max_id FROM "${table}"`,
      );
      const maxId = maxIdResult.rows[0]?.max_id;
      if (maxId) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), $1)`,
          [maxId],
        );
      }

      totalRows += rows.length;
      console.log(`  ✓ ${table}: ${rows.length} rows restored`);
    }

    await client.query("COMMIT");
    console.log(`\n✅ Restore complete: ${totalRows} rows across ${TABLES_ORDER.length} tables`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Restore failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

restore().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
