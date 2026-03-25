import axios from "axios";

const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY;
const OXAPAY_BASE = "https://api.oxapay.com";

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
  if (!OXAPAY_API_KEY) {
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
  if (!OXAPAY_API_KEY) {
    return { status: "Waiting" };
  }

  const response = await axios.post(`${OXAPAY_BASE}/merchants/inquiry`, {
    merchant: OXAPAY_API_KEY,
    trackId,
  });

  return response.data;
}

export function verifyWebhookSignature(body: Record<string, unknown>, hmacSent: string): boolean {
  if (!OXAPAY_API_KEY) return true;
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha512", OXAPAY_API_KEY)
    .update(JSON.stringify(body))
    .digest("hex");
  return hmac === hmacSent;
}
