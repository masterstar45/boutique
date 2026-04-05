import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

function enforceProductionSecurityConfig(): void {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return;

  const oxapayKey = process.env.OXAPAY_API_KEY?.trim();
  const strictHmac = process.env.OXAPAY_STRICT_HMAC === "true";
  const mockMode = process.env.OXAPAY_MOCK_MODE === "true";

  if (!oxapayKey) {
    throw new Error("OXAPAY_API_KEY must be set in production");
  }

  if (!strictHmac) {
    throw new Error("OXAPAY_STRICT_HMAC must be 'true' in production");
  }

  if (mockMode) {
    throw new Error("OXAPAY_MOCK_MODE must be disabled in production");
  }
}

async function ensureFileStorageTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        id SERIAL PRIMARY KEY,
        object_id TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        size INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    logger.info("file_storage table ready");
  } catch (err) {
    logger.error({ err }, "Failed to create file_storage table (non-fatal)");
  }
}

async function ensureRateLimitTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset_at ON api_rate_limits (reset_at);
    `);
    logger.info("api_rate_limits table ready");
  } catch (err) {
    logger.error({ err }, "Failed to create api_rate_limits table (non-fatal)");
  }
}

async function logDatabaseStatus() {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM users) as users
    `);
    const counts = result.rows[0];
    logger.info({
      products: Number(counts.products),
      orders: Number(counts.orders),
      users: Number(counts.users),
    }, "Database status on startup");
  } catch (err) {
    logger.warn({ err }, "Could not check database status (tables may not exist yet)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

enforceProductionSecurityConfig();

ensureFileStorageTable()
  .then(() => ensureRateLimitTable())
  .then(() => logDatabaseStatus())
  .then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
