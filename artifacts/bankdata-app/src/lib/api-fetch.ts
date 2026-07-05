/**
 * Thin wrapper around `fetch` for calls to the API server.
 *
 * Replaces the previous global `window.fetch` monkey-patch: it prepends the
 * configured API base URL to `/api/...` paths and attaches the bearer token,
 * while returning a raw `Response` so existing call sites keep their own
 * `res.ok` / `res.json()` handling.
 *
 * The generated React Query client already handles base URL + auth on its own
 * (see `setBaseUrl` / `setAuthTokenGetter` in `main.tsx`); this helper only
 * covers the hand-written `fetch` calls.
 */

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __API_BASE_URL?: string }).__API_BASE_URL;
    if (injected) return String(injected).replace(/\/+$/, "");
  }
  const env = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
  return env.replace(/\/+$/, "");
}

export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const base = resolveApiBaseUrl();
  const url = base && input.startsWith("/") ? `${base}${input}` : input;

  const headers = new Headers(init.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem("bankdata_token") : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}
