import axios from "axios";
import crypto from "crypto";

const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY;
const OXAPAY_BASE = "https://api.oxapay.com";
const OXAPAY_MOCK_MODE = (process.env.OXAPAY_MOCK_MODE ?? "").trim().toLowerCase() === "true";

function canUseMockMode(): boolean {
  return OXAPAY_MOCK_MODE && process.env.NODE_ENV !== "production";
}

function ensureOxaPayConfigured(action: string): void {
  if (OXAPAY_API_KEY) return;
  if (canUseMockMode()) return;
  throw new Error(`OXAPAY_API_KEY missing for ${action}. Set OXAPAY_MOCK_MODE=true only in non-production.`);
}

export interface OxaPayPaymentLink {
  trackId: string;
  payLink: string;
  amount: number;
  currency: string;
  expiredAt: number;
}

export interface OxaPayStatus {
  status: string;
  txHash?: string;
}

export async function createPaymentLink(params: {
  amount: number;
  currency?: string;
  orderId: string;
  callbackUrl?: string;
  returnUrl?: string;
  description?: string;
}): Promise<OxaPayPaymentLink> {
  ensureOxaPayConfigured("createPaymentLink");

  if (!OXAPAY_API_KEY && canUseMockMode()) {
    const mockTrack = `mock_${Date.now()}`;
    return {
      trackId: mockTrack,
      payLink: `https://pay.oxapay.com/mock/${mockTrack}`,
      amount: params.amount,
      currency: params.currency ?? "EUR",
      expiredAt: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  const body: Record<string, unknown> = {
    merchant: OXAPAY_API_KEY,
    amount: params.amount,
    currency: params.currency ?? "EUR",
    lifeTime: 60,
    orderId: params.orderId,
    description: params.description ?? "BANK$DATA Purchase",
  };

  if (params.callbackUrl) body.callbackUrl = params.callbackUrl;
  if (params.returnUrl) body.returnUrl = params.returnUrl;

  const response = await axios.post(`${OXAPAY_BASE}/merchants/request`, body);
  const data = response.data;

  if (data.result !== 100) {
    throw new Error(`OxaPay error: ${data.message ?? "Unknown error"}`);
  }

  return {
    trackId: String(data.trackId),
    payLink: data.payLink,
    amount: params.amount,
    currency: params.currency ?? "EUR",
    expiredAt: parseInt(String(data.expiredAt), 10) || Math.floor(Date.now() / 1000) + 3600,
  };
}

export async function getPaymentStatus(trackId: string): Promise<OxaPayStatus> {
  ensureOxaPayConfigured("getPaymentStatus");

  if (!OXAPAY_API_KEY && canUseMockMode()) {
    return { status: "Waiting" };
  }

  const response = await axios.post(`${OXAPAY_BASE}/merchants/inquiry`, {
    merchant: OXAPAY_API_KEY,
    trackId,
  });

  return response.data;
}

export function verifyWebhookSignature(body: Record<string, unknown>, hmacSent: string, rawBody?: string): boolean {
  if (!OXAPAY_API_KEY) return canUseMockMode();
  
  // Use raw body if available (for accurate HMAC verification), otherwise fallback to JSON stringification
  const bodyToHash = rawBody ?? JSON.stringify(body);
  const hmac = crypto.createHmac("sha512", OXAPAY_API_KEY)
    .update(bodyToHash)
    .digest("hex");
  const normalizedSent = hmacSent.replace(/^sha512=/i, "").trim().toLowerCase();
  const normalizedCalculated = hmac.trim().toLowerCase();
  const expected = Buffer.from(normalizedCalculated, "utf8");
  const provided = Buffer.from(normalizedSent, "utf8");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
