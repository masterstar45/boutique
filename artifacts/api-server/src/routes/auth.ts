import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

const ADMIN_IDS: Set<string> = new Set(
  (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

function isAdminTelegramId(telegramId: string): boolean {
  return ADMIN_IDS.has(telegramId);
}

function generateAffiliateCode(telegramId: string): string {
  return `REF${telegramId.slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function validateTelegramInitData(initData: string): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  // No bot token configured (dev mode) — skip validation
  if (!BOT_TOKEN) return true;
  // Bot token is set but no initData provided — reject
  if (!initData) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");
    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return expectedHash === hash;
  } catch {
    return false;
  }
}

router.post("/auth/telegram", async (req, res): Promise<void> => {
  const { initData, user } = req.body;

  if (!user || !user.id) {
    res.status(400).json({ error: "Données utilisateur manquantes" });
    return;
  }

  if (!validateTelegramInitData(initData)) {
    res.status(401).json({ error: "Signature Telegram invalide" });
    return;
  }

  const telegramId = String(user.id);

  let dbUser = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).then(r => r[0]);

  const shouldBeAdmin = isAdminTelegramId(telegramId);

  if (!dbUser) {
    const affiliateCode = generateAffiliateCode(telegramId);
    const [created] = await db.insert(usersTable).values({
      telegramId,
      username: user.username ?? null,
      firstName: user.first_name ?? "User",
      lastName: user.last_name ?? null,
      photoUrl: user.photo_url ?? null,
      balance: "0",
      affiliateCode,
      isAdmin: shouldBeAdmin,
    }).returning();
    dbUser = created;
  } else {
    const [updated] = await db.update(usersTable).set({
      username: user.username ?? dbUser.username,
      firstName: user.first_name ?? dbUser.firstName,
      lastName: user.last_name ?? dbUser.lastName,
      photoUrl: user.photo_url ?? dbUser.photoUrl,
      // Promote to admin if in TELEGRAM_ADMIN_CHAT_ID, never demote automatically
      ...(shouldBeAdmin && !dbUser.isAdmin ? { isAdmin: true } : {}),
    }).where(eq(usersTable.telegramId, telegramId)).returning();
    dbUser = updated;
  }

  const token = signToken({
    userId: dbUser.id,
    telegramId: dbUser.telegramId,
    isAdmin: dbUser.isAdmin,
  });

  res.json({
    token,
    user: {
      id: dbUser.id,
      telegramId: dbUser.telegramId,
      username: dbUser.username,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      photoUrl: dbUser.photoUrl,
      balance: dbUser.balance,
      affiliateCode: dbUser.affiliateCode,
      isAdmin: dbUser.isAdmin,
      createdAt: dbUser.createdAt,
    },
  });
});

export default router;
