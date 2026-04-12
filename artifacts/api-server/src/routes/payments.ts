import { Router, type IRouter } from "express";
import { db, pool, paymentsTable, ordersTable, orderItemsTable, productsTable, downloadsTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { requireAuth } from "../middlewares/auth";
import { createPaymentLink, getPaymentStatus, verifyWebhookSignature } from "../lib/oxapay";
import { sendPaymentConfirmation, sendOrderDeliveryFiles, notifyAdminOrder, getBotUsername } from "../lib/telegram-bot";
import { ObjectStorageService } from "../lib/objectStorage";
import { getPublicApiBaseUrl } from "../lib/public-url";
import { logger } from "../lib/logger";
import { checkStockAvailability, generateExportContent } from "../lib/fiche-parser";
import { convertToFicheFormat } from "../lib/fiche-converter";
import crypto from "crypto";

const storageService = new ObjectStorageService();

const router: IRouter = Router();

function generateDownloadToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function normalizeObjectPath(inputPath: string): string {
  const raw = String(inputPath || "").trim();
  if (!raw) return raw;

  if (raw.startsWith("/objects/")) {
    return raw;
  }

  if (raw.startsWith("/api/storage/objects/")) {
    return raw.replace("/api/storage", "");
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith("/api/storage/objects/")) {
        return url.pathname.replace("/api/storage", "");
      }
      if (url.pathname.startsWith("/objects/")) {
        return url.pathname;
      }
    } catch {
    }
  }

  return raw;
}

function resolveRecordQuantity(
  savedRecordQuantity: number | null | undefined,
  selectedOptionLabel: string | null | undefined,
  priceOptions: Array<{ label: string; price: string; quantity: string }> | null | undefined,
): number {
  const persisted = Number(savedRecordQuantity ?? 0);
  if (persisted > 0) return persisted;

  const options = priceOptions ?? [];
  if (options.length === 0) return 0;

  if (selectedOptionLabel) {
    const wanted = String(selectedOptionLabel).trim().toLowerCase();
    const matched = options.find(o => String(o.label ?? "").trim().toLowerCase() === wanted);
    if (matched) {
      return parseInt(matched.quantity ?? "0", 10) || 0;
    }
  }

  return parseInt(options[0].quantity ?? "0", 10) || 0;
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

  const publicApiBaseUrl = getPublicApiBaseUrl();
  const callbackUrl = publicApiBaseUrl ? `${publicApiBaseUrl}/api/payment-webhook` : undefined;

  const payment_link = await createPaymentLink({
    amount: parseFloat(order.amount),
    currency: "EUR",
    orderId: String(orderId),
    description: `BANK$DATA — Commande #${orderId}`,
    ...(callbackUrl ? { callbackUrl } : {}),
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

  const order = await db.select({ userId: ordersTable.userId })
    .from(ordersTable)
    .where(eq(ordersTable.id, payment.orderId))
    .then(r => r[0]);

  if (!order || order.userId !== req.user!.userId) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  if (payment.trackId && payment.status === "pending") {
    try {
      const statusData = await getPaymentStatus(payment.trackId);
      const normalizedStatus = String(statusData.status ?? "").trim().toLowerCase();
      if (normalizedStatus === "paid" || normalizedStatus === "confirming") {
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

/**
 * Reserve stock atomically using PostgreSQL FOR UPDATE.
 * Returns the new stockUsed value, or null if insufficient stock.
 */
async function reserveStock(
  txDb: any,
  productId: number,
  recordsConsumed: number,
): Promise<{ stockUsed: number; stock: number } | null> {
  // Lock the product row to prevent concurrent modifications
  const result = await txDb.execute(
    sql`SELECT id, stock, stock_used FROM products WHERE id = ${productId} FOR UPDATE`
  ) as any;

  const product = result?.rows?.[0] ?? result?.[0];

  if (!product) return null;

  const currentStock = Number(product.stock ?? 0);
  const currentUsed = Number(product.stock_used ?? 0);

  const stockCheck = checkStockAvailability(currentStock, currentUsed, recordsConsumed);
  if (!stockCheck.available) {
    logger.warn({ productId, ...stockCheck, requested: recordsConsumed }, stockCheck.message);
    return null;
  }

  const newStockUsed = currentUsed + recordsConsumed;

  await txDb.update(productsTable)
    .set({
      stockUsed: newStockUsed,
      totalSales: sql`${productsTable.totalSales} + 1`,
    })
    .where(eq(productsTable.id, productId));

  return { stockUsed: newStockUsed, stock: currentStock };
}

/**
 * Extract lines from a stock file.
 * Always takes from the BEGINNING of the file (offset 0) because
 * the file is rebuilt without consumed lines after each purchase.
 * For fiche-client products, converts extracted lines to FICHE format.
 */
async function extractStockLines(
  fileUrl: string,
  count: number,
  productName: string,
  isFicheProduct: boolean = false,
  outputFormat: "txt" | "csv" | "json" = "txt",
): Promise<{ fileBuffer: Buffer; generatedFileUrl: string; generatedFileName: string; updatedFileUrl: string } | null> {
  try {
    const objectPath = normalizeObjectPath(fileUrl);
    logger.info({ objectPath, count, productName, isFicheProduct, outputFormat }, "[stock] Reading source file");

    const buffer = await storageService.readObjectBuffer(objectPath);
    const text = buffer.toString('utf-8');
    const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

    logger.info({ objectPath, totalLines: allLines.length, count }, "[stock] Source file parsed");

    if (allLines.length === 0) {
      logger.warn({ objectPath }, "[stock] File is empty");
      return null;
    }

    const actualCount = Math.min(count, allLines.length);

    if (actualCount === allLines.length && allLines.length > 1) {
      logger.warn({
        objectPath,
        requestedCount: count,
        fileLines: allLines.length,
        productName,
      }, "[stock] WARNING: Extracting ALL remaining lines — price option quantity may be misconfigured");
    }

    const slice = allLines.slice(0, actualCount);

    let outputContent: string;
    let extension: string;
    let contentType: string;

    if (isFicheProduct) {
      outputContent = convertToFicheFormat(slice.join('\n'));
      extension = "txt";
      contentType = "text/plain";
    } else {
      const exported = generateExportContent(slice, outputFormat);
      outputContent = exported.content;
      extension = exported.extension;
      contentType = exported.contentType;
    }

    const outputBuffer = Buffer.from(outputContent, 'utf-8');
    const generatedFileUrl = await storageService.uploadObjectBuffer(outputBuffer, contentType);
    const safeName = productName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const generatedFileName = `${safeName}_${actualCount}_records.${extension}`;

    const remainingLines = allLines.slice(actualCount);
    const remainingContent = remainingLines.join('\n');
    const remainingBuffer = Buffer.from(remainingContent, 'utf-8');
    const updatedFileUrl = await storageService.uploadObjectBuffer(remainingBuffer, 'text/plain');

    logger.info({
      productName,
      fileName: generatedFileName,
      linesExtracted: actualCount,
      remainingStock: remainingLines.length,
      isFicheProduct,
      updatedFileUrl,
    }, "[stock] Extraction complete — stock file updated");

    return { fileBuffer: outputBuffer, generatedFileUrl, generatedFileName, updatedFileUrl };
  } catch (err) {
    logger.error({ err, fileUrl }, '[stock] Error extracting lines');
    return null;
  }
}

/**
 * Main payment processing pipeline:
 *   Phase 1 — Atomic stock reservation (FOR UPDATE + transaction)
 *   Phase 2 — File extraction (outside transaction, no locks held)
 *   Phase 3 — Telegram delivery with retry
 *   Phase 4 — Confirm sale OR rollback reservation
 */
async function processConfirmedPayment(orderId: number, paymentId: number): Promise<void> {
  const order = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).then(r => r[0]);
  if (!order) return;

  const items = await db.select({
    productId: orderItemsTable.productId,
    recordQuantity: orderItemsTable.recordQuantity,
    selectedOptionLabel: orderItemsTable.selectedOptionLabel,
    downloadLimit: productsTable.downloadLimit,
    downloadExpiry: productsTable.downloadExpiry,
    productName: productsTable.name,
    productFileUrl: productsTable.fileUrl,
    productPriceOptions: productsTable.priceOptions,
    productStock: productsTable.stock,
    productStockUsed: productsTable.stockUsed,
    productCategoryId: productsTable.categoryId,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  logger.info({ orderId, itemCount: items.length }, "Processing order items for delivery");

  const fileDeliveryBuffers: Array<{ productName: string; buffer: Buffer; fileName: string }> = [];
  // Track reservations for rollback if delivery fails
  const reservations: Array<{ productId: number; recordsConsumed: number; previousStockUsed: number }> = [];
  // Track stock file updates (productId -> new fileUrl)
  const stockFileUpdates: Map<number, string> = new Map();

  // ────────────────────────────────────────────────
  // PHASE 1: Atomic stock reservation (transaction)
  // ────────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const txDb = drizzle(client);

    for (const item of items) {
      const recordsConsumed = resolveRecordQuantity(
        item.recordQuantity,
        item.selectedOptionLabel,
        (item.productPriceOptions as Array<{ label: string; price: string; quantity: string }> | null | undefined),
      );

      logger.info({
        productName: item.productName,
        recordsConsumed,
        productStock: item.productStock,
        productStockUsed: item.productStockUsed,
        productFileUrl: item.productFileUrl ? "yes" : "no",
      }, "Item details");

      if (item.productFileUrl) {
        if (recordsConsumed <= 0) {
          throw new Error(`Configuration invalide: quantite livree non definie pour ${item.productName} (produit ${item.productId})`);
        }
        const reserved = await reserveStock(txDb, item.productId, recordsConsumed);
        if (!reserved) {
          throw new Error(`Stock insuffisant pour ${item.productName} (produit ${item.productId})`);
        }
        reservations.push({
          productId: item.productId,
          recordsConsumed,
          previousStockUsed: item.productStockUsed ?? 0,
        });
        logger.info({ productName: item.productName, newStockUsed: reserved.stockUsed, stock: reserved.stock }, "Stock reserved");
      } else {
        // No file → still count the sale
        await txDb.update(productsTable)
          .set({ totalSales: sql`${productsTable.totalSales} + 1` })
          .where(eq(productsTable.id, item.productId));
      }
    }

    // Mark order as "reserved" (not yet completed — will confirm after delivery)
    await txDb.update(ordersTable).set({ status: "reserved" }).where(eq(ordersTable.id, orderId));
    await client.query("COMMIT");
    logger.info({ orderId, reservations: reservations.length }, "Phase 1 — Stock reserved, transaction committed");
  } catch (txErr) {
    await client.query("ROLLBACK");
    logger.error({ err: txErr, orderId }, "Phase 1 — ROLLBACK, stock reservation failed");
    await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, orderId));
    return; // Stop here — nothing was consumed
  } finally {
    client.release();
  }

  // ────────────────────────────────────────────────
  // PHASE 2: Extract files (no DB locks held)
  // ────────────────────────────────────────────────
  let expectedFileCount = 0;
  try {
    for (const item of items) {
      const recordsConsumed = resolveRecordQuantity(
        item.recordQuantity,
        item.selectedOptionLabel,
        (item.productPriceOptions as Array<{ label: string; price: string; quantity: string }> | null | undefined),
      );

      if (!item.productFileUrl || recordsConsumed <= 0) continue;

      expectedFileCount++;

      let isFicheProduct = false;
      if (item.productCategoryId) {
        const cat = await db.select().from(categoriesTable)
          .where(eq(categoriesTable.id, item.productCategoryId))
          .then(r => r[0]);
        if (cat) {
          isFicheProduct = !!(
            cat.slug?.toLowerCase().includes("fiche") ||
            cat.name?.toLowerCase().includes("fiche")
          );
        }
      }

      if (!isFicheProduct && item.productName) {
        isFicheProduct = item.productName.toLowerCase().includes("fiche");
      }

      logger.info({
        orderId,
        productName: item.productName,
        productFileUrl: item.productFileUrl,
        recordsConsumed,
        isFicheProduct,
      }, "Phase 2 — About to extract stock file");

      const extracted = await extractStockLines(
        item.productFileUrl,
        recordsConsumed,
        item.productName ?? 'produit',
        isFicheProduct,
      );

      // Create download record regardless of extraction success
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (item.downloadExpiry ?? 7));
      const downloadToken = generateDownloadToken();

      await db.insert(downloadsTable).values({
        userId: order.userId,
        productId: item.productId,
        orderId,
        token: downloadToken,
        maxDownloads: item.downloadLimit ?? 5,
        expiresAt: expiry,
        generatedFileUrl: extracted?.generatedFileUrl ?? undefined,
        generatedFileName: extracted?.generatedFileName ?? undefined,
      });

      if (extracted) {
        fileDeliveryBuffers.push({
          productName: item.productName ?? "Produit",
          buffer: extracted.fileBuffer,
          fileName: extracted.generatedFileName,
        });
        // Track the new stock file URL (stock has been consumed)
        stockFileUpdates.set(item.productId, extracted.updatedFileUrl);
      } else {
        logger.error({ productName: item.productName, orderId, count: recordsConsumed }, "File extraction returned null — will rollback reservation");
      }
    }
  } catch (extractErr) {
    logger.error({ err: extractErr, orderId }, "Phase 2 — File extraction failed, rolling back stock");
    await cancelReservation(reservations, orderId);
    return;
  }

  // If we expected files but none could be extracted, rollback immediately
  if (expectedFileCount > 0 && fileDeliveryBuffers.length === 0) {
    logger.error({ orderId, expectedFileCount }, "Phase 2 — All file extractions failed, rolling back reservation");
    await cancelReservation(reservations, orderId);
    return;
  }

  // ────────────────────────────────────────────────
  // PHASE 3: Deliver via Telegram
  // ────────────────────────────────────────────────
  const user = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).then(r => r[0]);
  let deliverySuccess = false;

  if (user) {
    try {
      await sendPaymentConfirmation(user.telegramId, orderId, order.amount);
    } catch {}

    if (fileDeliveryBuffers.length > 0) {
      try {
        logger.info({ orderId, fileBuffersCount: fileDeliveryBuffers.length }, "Phase 3 — Sending files via Telegram");
        const delivery = await sendOrderDeliveryFiles(user.telegramId, orderId, fileDeliveryBuffers);
        logger.info({ orderId, sent: delivery.sent, total: delivery.total }, `File delivery: ${delivery.sent}/${delivery.total}`);
        deliverySuccess = delivery.sent > 0;
      } catch (err) {
        logger.error({ err, orderId }, "Phase 3 — Telegram delivery threw");
      }
    } else {
      // No files expected for this order (product without file) — consider success
      deliverySuccess = true;
    }
  }

  // ────────────────────────────────────────────────
  // PHASE 4: Confirm sale OR rollback reservation
  // ────────────────────────────────────────────────
  if (deliverySuccess) {
    // Update stock file URLs for products that had stock consumed
    for (const [productId, updatedFileUrl] of stockFileUpdates.entries()) {
      try {
        await db.update(productsTable)
          .set({ fileUrl: updatedFileUrl })
          .where(eq(productsTable.id, productId));
        logger.info({ productId, updatedFileUrl }, "Phase 4 — Stock file updated");
      } catch (err) {
        logger.error({ err, productId }, "Phase 4 — Failed to update product stock file (non-fatal)");
      }
    }

    await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, orderId));
    logger.info({ orderId, filesUpdated: stockFileUpdates.size }, "Phase 4 — Sale confirmed, order completed");

    // Notify admin
    if (user) {
      try {
        await notifyAdminOrder({
          username: user.username ?? user.firstName ?? "—",
          telegramId: user.telegramId,
          orderId,
          amount: order.amount,
          productNames: items.map(i => i.productName ?? "Produit"),
        });
      } catch {}
    }
  } else {
    logger.warn({ orderId }, "Phase 4 — Delivery failed, rolling back reservation");
    await cancelReservation(reservations, orderId);

    // Notify admin of failed delivery
    if (user) {
      try {
        await notifyAdminOrder({
          username: user.username ?? user.firstName ?? "—",
          telegramId: user.telegramId,
          orderId,
          amount: order.amount,
          productNames: items.map(i => `❌ ${i.productName ?? "Produit"} (échec livraison)`),
        });
      } catch {}
    }
  }
}

/**
 * Rollback: revert stockUsed to previous values and mark order as failed.
 * This restores the reserved stock so other buyers can purchase it.
 */
async function cancelReservation(
  reservations: Array<{ productId: number; recordsConsumed: number; previousStockUsed: number }>,
  orderId: number,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const txDb = drizzle(client);

    for (const r of reservations) {
      await txDb.update(productsTable)
        .set({
          stockUsed: r.previousStockUsed,
          totalSales: sql`GREATEST(0, ${productsTable.totalSales} - 1)`,
        })
        .where(eq(productsTable.id, r.productId));

      logger.info({ productId: r.productId, revertedTo: r.previousStockUsed }, "Stock reservation cancelled");
    }

    await txDb.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, orderId));
    await client.query("COMMIT");
    logger.info({ orderId, rolledBack: reservations.length }, "Reservation rollback committed");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err, orderId }, "Reservation rollback failed — manual intervention needed");
  } finally {
    client.release();
  }
}

router.post("/payments/pay-with-balance", requireAuth, async (req, res): Promise<void> => {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ error: "orderId requis" });
    return;
  }

  const client = await pool.connect();
  let createdPaymentId: number | null = null;

  try {
    await client.query("BEGIN");
    const txDb = drizzle(client);

    const orderResult = await txDb.execute(
      sql`SELECT id, user_id, status, amount FROM orders WHERE id = ${orderId} FOR UPDATE`
    ) as any;
    const order = orderResult?.rows?.[0] ?? orderResult?.[0];

    if (!order || Number(order.user_id) !== req.user!.userId) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    if (String(order.status) !== "pending") {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Commande déjà traitée" });
      return;
    }

    const userResult = await txDb.execute(
      sql`SELECT id, balance FROM users WHERE id = ${req.user!.userId} FOR UPDATE`
    ) as any;
    const user = userResult?.rows?.[0] ?? userResult?.[0];

    if (!user) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    const balance = parseFloat(String(user.balance ?? "0"));
    const amount = parseFloat(String(order.amount ?? "0"));

    if (!Number.isFinite(amount) || amount <= 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Montant de commande invalide" });
      return;
    }

    if (balance < amount) {
      await client.query("ROLLBACK");
      res.status(402).json({ error: "Solde insuffisant", balance: String(user.balance), required: String(order.amount) });
      return;
    }

    await txDb.update(usersTable)
      .set({ balance: sql`${usersTable.balance} - ${amount}` })
      .where(eq(usersTable.id, req.user!.userId));

    const [payment] = await txDb.insert(paymentsTable).values({
      orderId,
      amount: String(order.amount),
      currency: "EUR",
      status: "confirmed",
      confirmedAt: new Date(),
    }).returning();

    createdPaymentId = payment.id;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err, orderId, userId: req.user?.userId }, "pay-with-balance transaction failed");
    res.status(500).json({ error: "Erreur interne lors du paiement" });
    return;
  } finally {
    client.release();
  }

  await processConfirmedPayment(orderId, createdPaymentId!);

  res.json({ success: true, paymentId: createdPaymentId });
});

export { processConfirmedPayment };
export default router;
