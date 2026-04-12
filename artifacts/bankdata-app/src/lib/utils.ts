import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value || 0);
}

export function formatCrypto(amount: string | number, currency: string = 'USDT'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${value.toFixed(2)} ${currency}`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}

/**
 * Resolve a relative /api/... image URL to an absolute URL using the API base.
 * External URLs (https://...) and empty values are returned as-is.
 */
export function resolveImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/api/storage/objects/')) {
        // Prefer same-origin proxy path for maximum compatibility in Telegram WebView.
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
    }
    return url;
  }

  if (!url.startsWith('/api/')) return url;

  let base = '';
  if (typeof window !== 'undefined') {
    base = String((window as any).__API_BASE_URL || '').replace(/\/+$/, '');

    if (!base) {
      const host = window.location.hostname;
      // Railway frontend does not proxy /api/*; force direct API host when missing runtime config.
      if (host.endsWith('up.railway.app') && host !== 'api-server-production-823c.up.railway.app') {
        base = 'https://api-server-production-823c.up.railway.app';
      }
    }
  }

  return base ? `${base}${url}` : url;
}
