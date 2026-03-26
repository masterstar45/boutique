function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

function getDefaultPublicBaseUrl(): string | null {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) {
    return normalize(explicit);
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) {
    return `https://${replitDomain}`;
  }

  return null;
}

export function getPublicApiBaseUrl(): string | null {
  const explicit = process.env.PUBLIC_API_BASE_URL?.trim();
  if (explicit) return normalize(explicit);
  return getDefaultPublicBaseUrl();
}

export function getPublicMiniAppUrl(): string | null {
  const explicit = process.env.PUBLIC_MINI_APP_URL?.trim();
  if (explicit) return normalize(explicit);
  return getDefaultPublicBaseUrl();
}
