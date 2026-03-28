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

async function backup() {
  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  const data: Record<string, any[]> = {};
  let totalRows = 0;

  for (const table of TABLES_ORDER) {
    try {
      const result = await pool.query(`SELECT * FROM "${table}" ORDER BY id`);
      data[table] = result.rows;
      totalRows += result.rows.length;
      console.log(`  ✓ ${table}: ${result.rows.length} rows`);
    } catch (err: any) {
      console.log(`  ⚠ ${table}: skipped (${err.message})`);
      data[table] = [];
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  console.log(`\n✅ Backup saved: ${backupFile}`);
  console.log(`   Total: ${totalRows} rows across ${TABLES_ORDER.length} tables`);

  await pool.end();
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
