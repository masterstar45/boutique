import { Router, type IRouter } from "express";
import { Readable } from "stream";
import { getBot } from "../lib/telegram-bot";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /telegram-photo/:fileId
 *
 * Streams a Telegram profile photo through our server so the bot token never
 * leaves the backend. Previously the token was embedded in the stored photo
 * URL (https://api.telegram.org/file/bot<TOKEN>/...) and returned to clients,
 * leaking full control of the bot. Here only the opaque file_id is public.
 */
router.get("/telegram-photo/:fileId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
  const fileId = decodeURIComponent(String(raw ?? ""));

  // Telegram file_ids are opaque URL-safe base64-ish strings.
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(fileId)) {
    res.status(400).json({ error: "Invalid file id" });
    return;
  }

  const bot = getBot();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!bot || !token) {
    res.sendStatus(503);
    return;
  }

  try {
    const file = await bot.getFile(fileId);
    if (!file.file_path) {
      res.status(404).json({ error: "Photo introuvable" });
      return;
    }

    const upstream = await fetch(
      `https://api.telegram.org/file/bot${token}/${file.file_path}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!upstream.ok || !upstream.body) {
      res.sendStatus(502);
      return;
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    Readable.fromWeb(upstream.body as ReadableStream<Uint8Array>).pipe(res);
  } catch (err) {
    logger.warn({ err }, "Failed to proxy Telegram profile photo");
    res.sendStatus(502);
  }
});

export default router;
