type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function runChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const nodeEnv = (process.env.NODE_ENV ?? "").trim();
  const isProd = nodeEnv === "production";

  results.push({
    name: "NODE_ENV",
    ok: isProd,
    details: isProd ? "production" : `expected production, got '${nodeEnv || "(empty)"}'`,
  });

  const requiredVars = [
    "JWT_SECRET",
    "TELEGRAM_BOT_TOKEN",
    "CLOUDFLARE_TURNSTILE_SECRET_KEY",
    "CORS_ALLOWED_ORIGINS",
    "OXAPAY_API_KEY",
    "OXAPAY_STRICT_HMAC",
    "TELEGRAM_ADMIN_CHAT_ID",
  ];

  for (const variable of requiredVars) {
    const value = process.env[variable]?.trim() ?? "";
    results.push({
      name: variable,
      ok: value.length > 0,
      details: value.length > 0 ? "set" : "missing",
    });
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() ?? "";
  results.push({
    name: "JWT_SECRET strength",
    ok: jwtSecret.length >= 32,
    details: `length=${jwtSecret.length} (min 32)`,
  });

  const corsAllowed = process.env.CORS_ALLOWED_ORIGINS?.trim() ?? "";
  const corsItems = corsAllowed.split(",").map((v) => v.trim()).filter(Boolean);
  results.push({
    name: "CORS_ALLOWED_ORIGINS format",
    ok: corsItems.length > 0 && !corsItems.includes("*"),
    details: corsItems.length > 0 ? corsItems.join(", ") : "no origins configured",
  });

  const strictHmac = (process.env.OXAPAY_STRICT_HMAC ?? "").trim().toLowerCase();
  results.push({
    name: "OXAPAY_STRICT_HMAC",
    ok: strictHmac === "true",
    details: `value=${strictHmac || "(empty)"}`,
  });

  const adminIdsRaw = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "";
  const adminIds = adminIdsRaw.split(",").map((v) => v.trim()).filter(Boolean);
  const adminIdsValid = adminIds.length > 0 && adminIds.every((id) => /^-?\d+$/.test(id));
  results.push({
    name: "TELEGRAM_ADMIN_CHAT_ID format",
    ok: adminIdsValid,
    details: adminIds.length > 0 ? `count=${adminIds.length}` : "empty",
  });

  const siteKey = (process.env.CLOUDFLARE_TURNSTILE_SITE_KEY ?? process.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "").trim();
  results.push({
    name: "Turnstile site key",
    ok: siteKey.length > 0,
    details: siteKey.length > 0 ? "set" : "missing",
  });

  if (!isProd) {
    results.push({
      name: "Execution context",
      ok: false,
      details: "Run this script with production env values to validate real deployment readiness",
    });
  }

  return results;
}

function main(): void {
  try {
    requireEnv("DATABASE_URL");
  } catch {
    // DATABASE_URL is not mandatory for config checks, so keep going.
  }

  const results = runChecks();
  let failed = 0;

  console.log("Security configuration check\n");
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${result.name}: ${result.details}`);
    if (!result.ok) failed += 1;
  }

  console.log("\nSummary");
  console.log(`Total checks: ${results.length}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
