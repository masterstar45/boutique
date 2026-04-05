import { logger } from "./logger";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    logger.error("CLOUDFLARE_TURNSTILE_SECRET_KEY is missing");
    return false;
  }

  if (!token || token.trim().length === 0) {
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token.trim());
    if (remoteIp) body.set("remoteip", remoteIp);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Turnstile verify request failed");
      return false;
    }

    const data = (await response.json()) as TurnstileVerifyResponse;
    if (!data.success) {
      logger.warn({ errorCodes: data["error-codes"] ?? [] }, "Turnstile verification rejected");
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err }, "Turnstile verification error");
    return false;
  }
}
