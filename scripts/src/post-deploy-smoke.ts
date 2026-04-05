type SmokeResult = {
  name: string;
  ok: boolean;
  details: string;
};

type JsonObject = Record<string, unknown>;

async function requestJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: JsonObject | null; text: string }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: JsonObject | null = null;
  try {
    body = text ? (JSON.parse(text) as JsonObject) : null;
  } catch {
    body = null;
  }
  return { status: response.status, body, text };
}

function baseUrl(): string {
  const raw = process.env.API_BASE_URL?.trim() || process.env.PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000";
  return raw.replace(/\/+$/, "");
}

function authHeaders(token?: string): Record<string, string> {
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function run(): Promise<void> {
  const api = baseUrl();
  const userToken = process.env.USER_TOKEN?.trim() || "";
  const adminToken = process.env.ADMIN_TOKEN?.trim() || "";

  const results: SmokeResult[] = [];

  const health = await requestJson(`${api}/api/healthz`);
  results.push({
    name: "Health endpoint",
    ok: health.status === 200 && health.body?.status === "ok",
    details: `status=${health.status}`,
  });

  const turnstileCfg = await requestJson(`${api}/api/health/turnstile-config`);
  results.push({
    name: "Turnstile config endpoint",
    ok: turnstileCfg.status === 200 && typeof turnstileCfg.body?.siteKey === "string",
    details: `status=${turnstileCfg.status}`,
  });

  const debugNoAuth = await requestJson(`${api}/api/health/debug`);
  results.push({
    name: "Debug endpoint blocks unauthenticated",
    ok: debugNoAuth.status === 401,
    details: `status=${debugNoAuth.status}`,
  });

  const uploadNoAuth = await requestJson(`${api}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: "test.txt", size: 1, contentType: "text/plain" }),
  });
  results.push({
    name: "Upload URL blocks unauthenticated",
    ok: uploadNoAuth.status === 401,
    details: `status=${uploadNoAuth.status}`,
  });

  if (userToken) {
    const me = await requestJson(`${api}/api/users/me`, {
      headers: authHeaders(userToken),
    });
    results.push({
      name: "User token is valid",
      ok: me.status === 200,
      details: `status=${me.status}`,
    });

    const debugWithUser = await requestJson(`${api}/api/health/debug`, {
      headers: authHeaders(userToken),
    });
    results.push({
      name: "Debug endpoint blocks non-admin",
      ok: debugWithUser.status === 403 || debugWithUser.status === 401,
      details: `status=${debugWithUser.status}`,
    });
  }

  if (adminToken) {
    const debugWithAdmin = await requestJson(`${api}/api/health/debug`, {
      headers: authHeaders(adminToken),
    });
    results.push({
      name: "Debug endpoint allows admin",
      ok: debugWithAdmin.status === 200,
      details: `status=${debugWithAdmin.status}`,
    });

    const uploadWithAdmin = await requestJson(`${api}/api/storage/uploads/request-url`, {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ name: "admin-test.txt", size: 1, contentType: "text/plain" }),
    });
    results.push({
      name: "Upload URL allows admin",
      ok: uploadWithAdmin.status === 200,
      details: `status=${uploadWithAdmin.status}`,
    });
  }

  const expectWebhookReject = (process.env.EXPECT_WEBHOOK_REJECT ?? "true").trim().toLowerCase() === "true";
  const webhookProbe = await requestJson(`${api}/api/payment-webhook`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ status: "paid", trackId: "smoke-probe" }),
  });
  results.push({
    name: "Webhook signature enforcement",
    ok: expectWebhookReject ? webhookProbe.status === 403 : webhookProbe.status === 200 || webhookProbe.status === 403,
    details: `status=${webhookProbe.status}, expectedReject=${expectWebhookReject}`,
  });

  let failed = 0;
  console.log(`Post-deploy smoke checks against ${api}\n`);
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

void run();
