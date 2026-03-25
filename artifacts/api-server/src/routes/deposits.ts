import { Router, type IRouter } from "express";
import { db, depositsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createPaymentLink, getPaymentStatus } from "../lib/oxapay";
import { sendDepositConfirmation, notifyAdminDeposit, getBotUsername } from "../lib/telegram-bot";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/deposits/create", requireAuth, async (req, res): Promise<void> => {
  const { amount } = req.body;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const existing = await db.select().from(depositsTable)
    .where(and(
      eq(depositsTable.userId, req.user!.userId),
      eq(depositsTable.status, "pending")
    ))
    .then(r => r[0]);

  if (existing) {
    // If existing deposit has no payLink, generate one and update
    if (!existing.payLink) {
      try {
        const username = getBotUsername();
        const returnUrl = username ? `https://t.me/${username}` : undefined;
        const payment = await createPaymentLink({
          amount: parseFloat(existing.amount),
          currency: "EUR",
          orderId: `deposit_${req.user!.userId}_${Date.now()}`,
          description: "BANK$DATA — Rechargement de solde",
          ...(returnUrl ? { returnUrl } : {}),
        });
        const [updated] = await db.update(depositsTable)
          .set({ payLink: payment.payLink, trackId: payment.trackId })
          .where(eq(depositsTable.id, existing.id))
          .returning();
        res.json(serializeDeposit(updated));
      } catch (err) {
        logger.error({ err }, "Failed to generate payLink for existing deposit");
        res.json(serializeDeposit(existing));
      }
      return;
    }
    res.json(serializeDeposit(existing));
    return;
  }

  const orderId = `deposit_${req.user!.userId}_${Date.now()}`;
  const botName = getBotUsername();
  const returnUrl = botName ? `https://t.me/${botName}` : undefined;

  const payment = await createPaymentLink({
    amount: parseFloat(amount),
    currency: "EUR",
    orderId,
    description: "BANK$DATA — Rechargement de solde",
    ...(returnUrl ? { returnUrl } : {}),
  });

  const expiresAt = new Date(payment.expiredAt * 1000);

  const [deposit] = await db.insert(depositsTable).values({
    userId: req.user!.userId,
    trackId: payment.trackId,
    amount: parseFloat(amount).toFixed(2),
    currency: "EUR",
    status: "pending",
    payLink: payment.payLink,
    expiresAt,
  }).returning();

  res.status(201).json(serializeDeposit(deposit));
});

router.get("/deposits/:id/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const deposit = await db.select().from(depositsTable)
    .where(and(eq(depositsTable.id, id), eq(depositsTable.userId, req.user!.userId)))
    .then(r => r[0]);

  if (!deposit) {
    res.status(404).json({ error: "Dépôt introuvable" });
    return;
  }

  if (deposit.trackId && deposit.status === "pending") {
    try {
      const statusData = await getPaymentStatus(deposit.trackId);
      if (statusData.status === "Paid" || statusData.status === "Confirming") {
        await processConfirmedDeposit(deposit.id, statusData.txHash);
      }
    } catch (err) {
      logger.error({ err }, "Error checking deposit status");
    }
  }

  const updated = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).then(r => r[0]);
  res.json(serializeDeposit(updated!));
});

export async function processConfirmedDeposit(depositId: number, txHash?: string): Promise<void> {
  const deposit = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId)).then(r => r[0]);
  if (!deposit || deposit.status !== "pending") return;

  await db.update(depositsTable).set({
    status: "confirmed",
    txHash: txHash ?? null,
    confirmedAt: new Date(),
  }).where(eq(depositsTable.id, depositId));

  const [user] = await db.update(usersTable)
    .set({ balance: sql`${usersTable.balance} + ${deposit.amount}` })
    .where(eq(usersTable.id, deposit.userId))
    .returning();

  if (user) {
    try {
      await sendDepositConfirmation(
        user.telegramId,
        deposit.amount,
        user.balance ?? "0",
        deposit.currency
      );
      await notifyAdminDeposit({
        username: user.username ?? user.firstName ?? "—",
        telegramId: user.telegramId,
        amount: deposit.amount,
        currency: deposit.currency,
        newBalance: user.balance ?? "0",
      });
    } catch (err) {
      logger.error({ err }, "Failed to send deposit confirmation Telegram message");
    }
  }
}

function serializeDeposit(d: any) {
  return {
    id: d.id,
    userId: d.userId,
    trackId: d.trackId,
    amount: d.amount,
    currency: d.currency,
    status: d.status,
    payLink: d.payLink,
    payAddress: d.payAddress,
    qrCode: d.qrCode,
    expiresAt: d.expiresAt,
    confirmedAt: d.confirmedAt,
    createdAt: d.createdAt,
  };
}

export default router;
