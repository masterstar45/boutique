import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/turnstile-config", (_req, res) => {
  const siteKey =
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ||
    process.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ||
    "";

  res.setHeader("Cache-Control", "no-store");
  res.json({ siteKey });
});

/**
 * GET /api/health/debug
 * Show user info, Telegram ID, and admin status - useful for debugging
 */
router.get("/health/debug", requireAuth, async (req, res) => {
  try {
    const user = await db.select().from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .then(r => r[0]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      status: "ok",
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        isAdmin: user.isAdmin,
        balance: user.balance,
      },
      storage: {
        privateObjectDir: process.env.PRIVATE_OBJECT_DIR ? "✅ Set" : "❌ Not set",
        publicObjectPaths: process.env.PUBLIC_OBJECT_SEARCH_PATHS ? "✅ Set" : "❌ Not set",
      },
      telegram: {
        botTokenSet: process.env.TELEGRAM_BOT_TOKEN ? "✅ Yes" : "❌ No",
        adminIds: process.env.TELEGRAM_ADMIN_CHAT_ID ? `✅ ${process.env.TELEGRAM_ADMIN_CHAT_ID}` : "❌ Not set",
      },
      cors: {
        status: "✅ Enabled",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Debug endpoint error", details: String(err) });
  }
});

export default router;
