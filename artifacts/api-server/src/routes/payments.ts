import { Router, type IRouter } from "express";
import { db, paymentsTable, ordersTable, orderItemsTable, productsTable, downloadsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createPaymentLink, getPaymentStatus, verifyWebhookSignature } from "../lib/oxapay";
import { sendPaymentConfirmation, notifyAdminOrder, getBotUsername } from "../lib/telegram-bot";
import { ObjectStorageService } from "../lib/objectStorage";
import crypto from "crypto";

const storageService = new ObjectStorageService();

const router: IRouter = Router();

function generateDownloadToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/payments/create", requireAuth, async (req, res): Promise<void> => {
  const { orderId, currency } = req.body;

  if (!orderId) {
    res.status(400).json({ error: "orderId requis" });
    return;
  }

  const order = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, req.user!.userId)))
    .then(r => r[0]);

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const existing = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.orderId, orderId)))
    .then(r => r[0]);

  if (existing && existing.status === "pending") {
    res.json({
      id: existing.id,
      orderId: existing.orderId,
      trackId: existing.trackId,
      amount: existing.amount,
      currency: existing.currency,
      status: existing.status,
      payLink: existing.payLink,
      expiresAt: existing.expiresAt,
    });
    return;
  }

  const botName = getBotUsername();
  const returnUrl = botName ? `https://t.me/${botName}` : undefined;

  const payment_link = await createPaymentLink({
    amount: parseFloat(order.amount),
    currency: "EUR",
    orderId: String(orderId),
    description: `BANK$DATA — Commande #${orderId}`,
    ...(returnUrl ? { returnUrl } : {}),
  });

  const expiresAt = new Date(payment_link.expiredAt * 1000);

  const [payment] = await db.insert(paymentsTable).values({
    orderId,
    trackId: payment_link.trackId,
    amount: order.amount,
    currency: "EUR",
    status: "pending",
    payLink: payment_link.payLink,
    expiresAt,
  }).returning();

  res.status(201).json({
    id: payment.id,
    orderId: payment.orderId,
    trackId: payment.trackId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    payLink: payment.payLink,
    expiresAt: payment.expiresAt,
  });
});

router.get("/payments/:id/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const payment = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).then(r => r[0]);

  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }

  if (payment.trackId && payment.status === "pending") {
    try {
      const statusData = await getPaymentStatus(payment.trackId);
      if (statusData.status === "Paid" || statusData.status === "Confirming") {
        await db.update(paymentsTable).set({
          status: "confirmed",
          txHash: statusData.txHash,
          confirmedAt: new Date(),
        }).where(eq(paymentsTable.id, id));

        await processConfirmedPayment(payment.orderId, payment.id);
      }
    } catch {
    }
  }

  const updated = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).then(r => r[0]);

  res.json({
    id: updated!.id,
    status: updated!.status,
    confirmedAt: updated!.confirmedAt,
  });
});

async function extractStockLines(
  fileUrl: string,
  offset: number,
  count: number,
  productName: string,
): Promise<{ generatedFileUrl: string; generatedFileName: string } | null> {
  try {
    const buffer = await storageService.readObjectBuffer(fileUrl);
    const text = buffer.toString('utf-8');
    const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

    const slice = allLines.slice(offset, offset + count);
    if (slice.length === 0) return null;

    const outputText = slice.join('\n') + '\n';
    const outputBuffer = Buffer.from(outputText, 'utf-8');

    const generatedFileUrl = await storageService.uploadObjectBuffer(outputBuffer, 'text/plain');
    const safeName = productName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const generatedFileName = `${safeName}_${count}_records.txt`;

    return { generatedFileUrl, generatedFileName };
  } catch (err) {
    console.error('[stock] Error extracting lines:', err);
    return null;
  }
}

async function processConfirmedPayment(orderId: number, paymentId: number): Promise<void> {
  await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, orderId));

  const order = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).then(r => r[0]);
  if (!order) return;

  const items = await db.select({
    productId: orderItemsTable.productId,
    recordQuantity: orderItemsTable.recordQuantity,
    downloadLimit: productsTable.downloadLimit,
    downloadExpiry: productsTable.downloadExpiry,
    productName: productsTable.name,
    productFileUrl: productsTable.fileUrl,
    productStock: productsTable.stock,
    productStockUsed: productsTable.stockUsed,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  for (const item of items) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (item.downloadExpiry ?? 7));

    const recordsConsumed = item.recordQuantity ?? 0;

    let generatedFileUrl: string | null = null;
    let generatedFileName: string | null = null;

    if (item.productFileUrl && recordsConsumed > 0 && (item.productStock ?? 0) > 0) {
      const currentOffset = item.productStockUsed ?? 0;
      const extracted = await extractStockLines(
        item.productFileUrl,
        currentOffset,
        recordsConsumed,
        item.productName ?? 'produit',
      );
      if (extracted) {
        generatedFileUrl = extracted.generatedFileUrl;
        generatedFileName = extracted.generatedFileName;
      }
    }

    await db.insert(downloadsTable).values({
      userId: order.userId,
      productId: item.productId,
      orderId,
      token: generateDownloadToken(),
      maxDownloads: item.downloadLimit ?? 5,
      expiresAt: expiry,
      generatedFileUrl: generatedFileUrl ?? undefined,
      generatedFileName: generatedFileName ?? undefined,
    });

    await db.update(productsTable)
      .set({
        totalSales: sql`${productsTable.totalSales} + 1`,
        stockUsed: recordsConsumed > 0
          ? sql`LEAST(${productsTable.stock}, ${productsTable.stockUsed} + ${recordsConsumed})`
          : productsTable.stockUsed,
      })
      .where(eq(productsTable.id, item.productId));
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).then(r => r[0]);
  if (user) {
    const productNames = items.map(i => i.productName ?? "Produit").filter(Boolean);
    await sendPaymentConfirmation(user.telegramId, orderId, order.amount);
    await notifyAdminOrder({
      username: user.username ?? user.firstName ?? "—",
      telegramId: user.telegramId,
      orderId,
      amount: order.amount,
      productNames,
    });
  }
}

export { processConfirmedPayment };
export default router;
