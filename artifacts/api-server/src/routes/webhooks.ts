import { Router, type IRouter } from "express";
import { getBot, sendStartMessage, notifyAdminNewUser } from "../lib/telegram-bot";
import { db, usersTable, paymentsTable, ordersTable, depositsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processConfirmedPayment } from "./payments";
import { processConfirmedDeposit } from "./deposits";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/telegram-webhook", async (req, res): Promise<void> => {
  const bot = getBot();
  if (!bot) {
    res.sendStatus(200);
    return;
  }

  const update = req.body;

  if (update.message?.text === "/start") {
    const msg = update.message;
    const chatId = msg.chat.id;
    const from = msg.from;

    if (!from) {
      res.sendStatus(200);
      return;
    }

    const telegramId = String(from.id);

    let user = await db.select().from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .then(r => r[0]);

    // Fetch Telegram profile photo
    let photoUrl: string | null = null;
    try {
      const photos = await bot.getUserProfilePhotos(from.id, { limit: 1 });
      if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.getFile(fileId);
        if (file.file_path) {
          photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        }
      }
    } catch (err) {
      logger.warn({ err }, "Could not fetch Telegram profile photo");
    }

    let isNewUser = false;
    if (!user) {
      const [created] = await db.insert(usersTable).values({
        telegramId,
        username: from.username ?? null,
        firstName: from.first_name ?? "User",
        lastName: from.last_name ?? null,
        balance: "0",
        affiliateCode: `REF${telegramId.slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        isAdmin: false,
        photoUrl,
      }).returning();
      user = created;
      isNewUser = true;
    } else {
      // Update profile info for returning users
      const [updated] = await db.update(usersTable).set({
        username: from.username ?? user.username,
        firstName: from.first_name ?? user.firstName,
        lastName: from.last_name ?? user.lastName,
        ...(photoUrl ? { photoUrl } : {}),
      }).where(eq(usersTable.telegramId, telegramId)).returning();
      user = updated;
    }

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
    const miniAppUrl = domains ? `https://${domains}/` : "https://t.me";

    try {
      await sendStartMessage(chatId, from.username, from.id, user.balance ?? "0", miniAppUrl);
      if (isNewUser) {
        await notifyAdminNewUser({
          username: from.username ?? "—",
          telegramId,
          firstName: from.first_name ?? "User",
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to send start message");
    }
  }

  if (update.callback_query?.data === "recharge_balance") {
    const bot2 = getBot();
    if (bot2) {
      await bot2.answerCallbackQuery(update.callback_query.id, {
        text: "Rechargement disponible depuis l'application",
        show_alert: true,
      });
    }
  }

  res.sendStatus(200);
});

router.post("/payment-webhook", async (req, res): Promise<void> => {
  const body = req.body;

  logger.info({ body }, "Payment webhook received");

  if (body.status === "Paid" || body.status === "Confirming") {
    const trackId = body.trackId;
    if (!trackId) {
      res.sendStatus(200);
      return;
    }

    const payment = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.trackId, trackId))
      .then(r => r[0]);

    if (payment && payment.status === "pending") {
      await db.update(paymentsTable).set({
        status: "confirmed",
        txHash: body.txHash ?? null,
        confirmedAt: new Date(),
      }).where(eq(paymentsTable.id, payment.id));

      await processConfirmedPayment(payment.orderId, payment.id);
    } else {
      const deposit = await db.select().from(depositsTable)
        .where(eq(depositsTable.trackId, trackId))
        .then(r => r[0]);

      if (deposit && deposit.status === "pending") {
        await processConfirmedDeposit(deposit.id, body.txHash);
      }
    }
  }

  if (body.status === "Expired") {
    const trackId = body.trackId;
    if (trackId) {
      const payment = await db.select().from(paymentsTable)
        .where(eq(paymentsTable.trackId, trackId))
        .then(r => r[0]);

      if (payment) {
        await db.update(paymentsTable).set({ status: "expired" }).where(eq(paymentsTable.id, payment.id));
        await db.update(ordersTable).set({ status: "expired" }).where(eq(ordersTable.id, payment.orderId));
      } else {
        const deposit = await db.select().from(depositsTable)
          .where(eq(depositsTable.trackId, trackId))
          .then(r => r[0]);

        if (deposit) {
          await db.update(depositsTable).set({ status: "expired" }).where(eq(depositsTable.id, deposit.id));
        }
      }
    }
  }

  res.sendStatus(200);
});

export default router;
