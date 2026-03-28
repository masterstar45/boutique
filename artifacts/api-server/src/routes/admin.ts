import { Router, type IRouter } from "express";
import { db, productsTable, ordersTable, orderItemsTable, usersTable, promoCodesTable, affiliatesTable, botButtonsTable, categoriesTable } from "@workspace/db";
import { eq, desc, sql, and, gte, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { sendAdminCreditNotification } from "../lib/telegram-bot";
import { getAllRubriqueCountries, isValidRubrique, setRubriqueCountries } from "../lib/rubriqueCountries";
import { ObjectStorageService } from "../lib/objectStorage";
import { convertToFicheFormat } from "../lib/fiche-converter";

const storageService = new ObjectStorageService();

/**
 * Normalise un chemin d'objet en /objects/...
 */
function normalizeObjectPath(inputPath: string): string {
  const raw = String(inputPath || "").trim();
  if (!raw) return raw;
  if (raw.startsWith("/objects/")) return raw;
  if (raw.startsWith("/api/storage/objects/")) return raw.replace("/api/storage", "");
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith("/api/storage/objects/")) return url.pathname.replace("/api/storage", "");
      if (url.pathname.startsWith("/objects/")) return url.pathname;
    } catch {}
  }
  return raw;
}

/**
 * Lit un fichier stock et retourne le nombre de lignes non-vides.
 */
async function countFileLines(fileUrl: string): Promise<number> {
  try {
    const objectPath = normalizeObjectPath(fileUrl);
    const buffer = await storageService.readObjectBuffer(objectPath);
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.length;
  } catch (err) {
    console.warn("[admin] Could not count file lines:", err);
    return 0;
  }
}

/**
 * Convertit un fichier au format FICHE CLIENT si la catégorie est "fiche client"
 * Retourne le nouveau fileUrl si conversion, sinon retourne l'URL original
 */
async function maybeConvertFicheFile(fileUrl: string, categoryId: number | null): Promise<string> {
  try {
    if (!fileUrl || !categoryId) return fileUrl;

    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .then(r => r[0]);

    if (!category) return fileUrl;

    // Check if category slug or name contains "fiche"
    const isFicheCategory = (
      category.slug?.toLowerCase().includes("fiche") ||
      category.name.toLowerCase().includes("fiche")
    );

    if (!isFicheCategory) return fileUrl;

    // Read original file
    const objectPath = normalizeObjectPath(fileUrl);
    const buffer = await storageService.readObjectBuffer(objectPath);
    const text = buffer.toString('utf-8');

    // Convert to FICHE format
    const convertedText = convertToFicheFormat(text);

    // Upload converted file
    const convertedBuffer = Buffer.from(convertedText, 'utf-8');
    const newFileUrl = await storageService.uploadObjectBuffer(convertedBuffer, 'text/plain');

    console.log(`[admin] Converted file to FICHE format: ${fileUrl} -> ${newFileUrl}`);
    return newFileUrl;
  } catch (err) {
    console.warn("[admin] Could not convert file to FICHE format:", err);
    return fileUrl;
  }
}

const router: IRouter = Router();

let botButtonsTableEnsured = false;

async function ensureBotButtonsTable(): Promise<void> {
  if (botButtonsTableEnsured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_buttons (
      id serial PRIMARY KEY,
      label text NOT NULL,
      url text NOT NULL,
      is_web_app boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      "row" integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    ALTER TABLE bot_buttons ADD COLUMN IF NOT EXISTS "row" integer NOT NULL DEFAULT 0
  `);

  botButtonsTableEnsured = true;
}

router.get("/admin/rubriques/countries", requireAdmin, async (_req, res): Promise<void> => {
  const mapping = await getAllRubriqueCountries();
  res.json({ rubriques: mapping });
});

router.put("/admin/rubriques/:rubrique/countries", requireAdmin, async (req, res): Promise<void> => {
  const rubriqueRaw = String(req.params.rubrique || "").trim().toLowerCase();

  if (!isValidRubrique(rubriqueRaw)) {
    res.status(400).json({ error: "Rubrique invalide" });
    return;
  }

  const countriesInput = Array.isArray(req.body?.countries) ? req.body.countries : [];
  const updated = await setRubriqueCountries(rubriqueRaw, countriesInput);

  res.json({ rubrique: rubriqueRaw, countries: updated });
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalRevenueResult] = await db.select({
    total: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`.as("total"),
  }).from(ordersTable).where(eq(ordersTable.status, "completed"));

  const [todayRevenueResult] = await db.select({
    total: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`.as("total"),
  }).from(ordersTable).where(and(
    eq(ordersTable.status, "completed"),
    gte(ordersTable.createdAt, today)
  ));

  const [totalOrdersResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(ordersTable);

  const [todayOrdersResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(ordersTable).where(gte(ordersTable.createdAt, today));

  const [pendingOrdersResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(ordersTable).where(eq(ordersTable.status, "pending"));

  const [totalUsersResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(usersTable);

  const [newUsersResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(usersTable).where(gte(usersTable.createdAt, today));

  const [totalProductsResult] = await db.select({
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(productsTable).where(eq(productsTable.isActive, true));

  res.json({
    totalRevenue: String(totalRevenueResult.total ?? "0"),
    revenueToday: String(todayRevenueResult.total ?? "0"),
    totalOrders: Number(totalOrdersResult.count),
    ordersToday: Number(todayOrdersResult.count),
    pendingOrders: Number(pendingOrdersResult.count),
    totalUsers: Number(totalUsersResult.count),
    newUsersToday: Number(newUsersResult.count),
    totalProducts: Number(totalProductsResult.count),
  });
});

function serializeProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    priceOptions: p.priceOptions ?? [],
    stock: p.stock ?? 0,
    stockUsed: p.stockUsed ?? 0,
    fileUrl: p.fileUrl,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    tags: p.tags ?? [],
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    isNew: p.isNew,
    fileName: p.fileName,
    fileType: p.fileType,
    fileSize: p.fileSize,
    downloadLimit: p.downloadLimit,
    downloadExpiry: p.downloadExpiry,
    totalSales: p.totalSales,
    createdAt: p.createdAt,
  };
}

function computeBasePrice(priceOptions: Array<{ label: string; price: string }> | null | undefined): string {
  if (!priceOptions || priceOptions.length === 0) return "0";
  const prices = priceOptions.map(o => parseFloat(o.price)).filter(n => !isNaN(n));
  if (prices.length === 0) return "0";
  return String(Math.min(...prices));
}

router.get("/admin/stock-debug/:productId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId as string, 10);
    const product = await db.select().from(productsTable)
      .where(eq(productsTable.id, productId))
      .then(r => r[0]);

    if (!product) {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }

    let fileLineCount = 0;
    let firstLines: string[] = [];
    if (product.fileUrl) {
      try {
        const objectPath = normalizeObjectPath(product.fileUrl);
        const buffer = await storageService.readObjectBuffer(objectPath);
        const text = buffer.toString('utf-8');
        const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        fileLineCount = allLines.length;
        firstLines = allLines.slice(0, 5);
      } catch (e) {
        firstLines = [`Erreur lecture fichier: ${e}`];
      }
    }

    const priceOpts = (product.priceOptions as Array<{ label: string; price: string; quantity: string }>) ?? [];

    res.json({
      productId: product.id,
      name: product.name,
      dbStock: product.stock,
      dbStockUsed: product.stockUsed,
      dbStockRemaining: (product.stock ?? 0) - (product.stockUsed ?? 0),
      fileUrl: product.fileUrl ? "set" : "null",
      actualFileLines: fileLineCount,
      mismatch: fileLineCount !== ((product.stock ?? 0) - (product.stockUsed ?? 0)),
      priceOptions: priceOpts.map(o => ({
        label: o.label,
        price: o.price,
        quantity: o.quantity,
        quantityParsed: parseInt(o.quantity ?? "0", 10) || 0,
      })),
      firstFiveLines: firstLines,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/products", requireAdmin, async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
  res.json({ products: products.map(serializeProduct) });
});

router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const { name, description, priceOptions, stock, fileUrl, fileName, fileType, fileSize, categoryId, tags, imageUrl, isActive, isFeatured, isBestSeller, isNew, downloadLimit, downloadExpiry } = req.body;

  if (!name || !description || !priceOptions?.length) {
    res.status(400).json({ error: "Champs requis manquants (nom, description, options de prix)" });
    return;
  }

  const price = computeBasePrice(priceOptions);

  let processedFileUrl = fileUrl ?? null;

  let computedStock = stock ?? 0;
  if (typeof processedFileUrl === "string" && processedFileUrl.length > 0) {
    const lineCount = await countFileLines(processedFileUrl);
    if (lineCount > 0) computedStock = lineCount;
  }

  const [product] = await db.insert(productsTable).values({
    name,
    description,
    price,
    priceOptions: priceOptions ?? [],
    stock: computedStock,
    fileUrl: processedFileUrl,
    fileName: fileName ?? null,
    fileType: fileType ?? null,
    fileSize: fileSize ?? null,
    categoryId: categoryId ?? null,
    tags: tags ?? [],
    imageUrl: imageUrl ?? null,
    isActive: isActive ?? true,
    isFeatured: isFeatured ?? false,
    isBestSeller: isBestSeller ?? false,
    isNew: isNew ?? true,
    downloadLimit: downloadLimit ?? 5,
    downloadExpiry: downloadExpiry ?? 7,
  }).returning();

  res.status(201).json(serializeProduct(product));
});

router.put("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { name, description, priceOptions, stock, fileUrl, fileName, fileType, fileSize, categoryId, tags, imageUrl, isActive, isFeatured, isBestSeller, isNew, downloadLimit, downloadExpiry } = req.body;

  const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).then(r => r[0]);
  if (!existing) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  const price = computeBasePrice(priceOptions);

  let processedFileUrl = fileUrl ?? null;

  const currentStockUsed = existing.stockUsed ?? 0;
  let parsedStock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
  const hasNewStockFile = typeof processedFileUrl === "string" && processedFileUrl.length > 0 && processedFileUrl !== (existing.fileUrl ?? "");

  // Auto-calculate stock from file line count when a new file is uploaded
  if (hasNewStockFile) {
    const lineCount = await countFileLines(processedFileUrl);
    if (lineCount > 0) parsedStock = lineCount;
  }

  let nextStockUsed = currentStockUsed;
  if (hasNewStockFile) {
    nextStockUsed = 0;
  } else if (parsedStock < nextStockUsed) {
    nextStockUsed = parsedStock;
  }

  const [product] = await db.update(productsTable).set({
    name, description, price,
    priceOptions: priceOptions ?? [],
    stock: parsedStock,
    stockUsed: nextStockUsed,
    fileUrl: processedFileUrl, fileName, fileType, fileSize, categoryId,
    tags: tags ?? [],
    imageUrl, isActive, isFeatured, isBestSeller, isNew,
    downloadLimit, downloadExpiry,
  }).where(eq(productsTable.id, id)).returning();

  res.json(serializeProduct(product));
});

router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  const orders = await db.select({
    id: ordersTable.id,
    userId: ordersTable.userId,
    username: usersTable.username,
    status: ordersTable.status,
    amount: ordersTable.amount,
    createdAt: ordersTable.createdAt,
  })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt));

  const result = await Promise.all(orders.map(async (order) => {
    const [itemCount] = await db.select({
      count: sql<number>`COUNT(*)`.as("count"),
    }).from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

    return {
      id: order.id,
      userId: order.userId,
      username: order.username ?? `User ${order.userId}`,
      status: order.status,
      amount: order.amount,
      itemCount: Number(itemCount.count),
      createdAt: order.createdAt,
    };
  }));

  res.json({ orders: result });
});

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({
    users: users.map(u => ({
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      photoUrl: u.photoUrl,
      balance: u.balance,
      affiliateCode: u.affiliateCode,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    })),
  });
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Statut invalide" });
    return;
  }

  const [order] = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning();
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  res.json({ id: order.id, status: order.status });
});

router.patch("/admin/users/:id/admin", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { isAdmin } = req.body;

  if (typeof isAdmin !== 'boolean') {
    res.status(400).json({ error: "isAdmin doit être un booléen" });
    return;
  }

  if (id === req.user!.userId) {
    res.status(403).json({ error: "Vous ne pouvez pas modifier votre propre rôle." });
    return;
  }

  const [user] = await db.update(usersTable).set({ isAdmin }).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({ id: user.id, isAdmin: user.isAdmin });
});

router.get("/admin/promo-codes", requireAdmin, async (_req, res): Promise<void> => {
  const promoCodes = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt));
  res.json({ promoCodes });
});

router.post("/admin/promo-codes", requireAdmin, async (req, res): Promise<void> => {
  const { code, discountType, discountValue, maxUses, minOrderAmount, isActive, expiresAt } = req.body;

  if (!code || !discountType || !discountValue) {
    res.status(400).json({ error: "Champs requis manquants" });
    return;
  }

  const [promo] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase(),
    discountType,
    discountValue: String(discountValue),
    maxUses: maxUses ?? null,
    minOrderAmount: minOrderAmount ? String(minOrderAmount) : "0",
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  res.status(201).json(promo);
});

// ─── Admins Management ───────────────────────────────────────────────────────

router.get("/admin/admins", requireAdmin, async (_req, res): Promise<void> => {
  const admins = await db.select().from(usersTable)
    .where(eq(usersTable.isAdmin, true))
    .orderBy(usersTable.createdAt);
  res.json({
    admins: admins.map(u => ({
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      photoUrl: u.photoUrl,
      balance: u.balance,
      createdAt: u.createdAt,
    })),
  });
});

router.post("/admin/admins/promote", requireAdmin, async (req, res): Promise<void> => {
  const { telegramId } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: "Telegram ID requis" });
    return;
  }
  const user = await db.select().from(usersTable)
    .where(eq(usersTable.telegramId, String(telegramId)))
    .then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "Aucun utilisateur trouvé avec ce Telegram ID" });
    return;
  }
  if (user.isAdmin) {
    res.status(400).json({ error: "Cet utilisateur est déjà admin" });
    return;
  }
  const [updated] = await db.update(usersTable)
    .set({ isAdmin: true })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({
    id: updated.id,
    telegramId: updated.telegramId,
    username: updated.username,
    isAdmin: updated.isAdmin,
  });
});

router.delete("/admin/admins/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (id === req.user!.userId) {
    res.status(403).json({ error: "Vous ne pouvez pas retirer vos propres droits admin." });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ isAdmin: false })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({ id: updated.id, isAdmin: updated.isAdmin });
});

// ─── Credit Balance ───────────────────────────────────────────────────────────

router.post("/admin/credit", requireAdmin, async (req, res): Promise<void> => {
  const { telegramId, amount, note } = req.body;

  if (!telegramId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    res.status(400).json({ error: "Telegram ID et montant valide requis" });
    return;
  }

  const user = await db.select().from(usersTable)
    .where(eq(usersTable.telegramId, String(telegramId)))
    .then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "Aucun utilisateur trouvé avec ce Telegram ID" });
    return;
  }

  const creditAmount = parseFloat(amount).toFixed(2);
  const [updated] = await db.update(usersTable)
    .set({ balance: sql`${usersTable.balance} + ${creditAmount}::numeric` })
    .where(eq(usersTable.id, user.id))
    .returning();

  try {
    await sendAdminCreditNotification(
      user.telegramId,
      creditAmount,
      String(updated.balance),
      note ?? null,
    );
  } catch (_) {}

  res.json({
    success: true,
    userId: updated.id,
    username: updated.username,
    firstName: updated.firstName,
    newBalance: updated.balance,
    credited: creditAmount,
  });
});

// ─── Affiliates Management ─────────────────────────────────────────────────

router.get("/admin/affiliates", requireAdmin, async (_req, res): Promise<void> => {
  const affiliates = await db
    .select({
      id: affiliatesTable.id,
      userId: affiliatesTable.userId,
      code: affiliatesTable.code,
      commissionRate: affiliatesTable.commissionRate,
      totalReferrals: affiliatesTable.totalReferrals,
      totalEarnings: affiliatesTable.totalEarnings,
      createdAt: affiliatesTable.createdAt,
      username: usersTable.username,
      firstName: usersTable.firstName,
      telegramId: usersTable.telegramId,
    })
    .from(affiliatesTable)
    .leftJoin(usersTable, eq(affiliatesTable.userId, usersTable.id))
    .orderBy(desc(affiliatesTable.totalEarnings));

  res.json({ affiliates });
});

router.patch("/admin/affiliates/:id/commission", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { commissionRate } = req.body;

  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    res.status(400).json({ error: "Taux de commission invalide (0-100)" });
    return;
  }

  const [updated] = await db
    .update(affiliatesTable)
    .set({ commissionRate: String(rate.toFixed(2)) })
    .where(eq(affiliatesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Affilié introuvable" });
    return;
  }

  res.json({ id: updated.id, commissionRate: updated.commissionRate });
});

router.post("/admin/affiliates/:userId/sync", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const affiliate = await db
    .select()
    .from(affiliatesTable)
    .where(eq(affiliatesTable.userId, userId))
    .then(r => r[0]);

  if (!affiliate) {
    res.status(404).json({ error: "Affilié introuvable" });
    return;
  }

  const referrals = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(usersTable)
    .where(sql`${usersTable.referredBy} = ${affiliate.code}`);

  const earnings = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.amount} * ${affiliate.commissionRate} / 100), 0)`.as("total") })
    .from(ordersTable)
    .where(and(eq(ordersTable.affiliateCode, affiliate.code), eq(ordersTable.status, "completed")));

  const [updated] = await db
    .update(affiliatesTable)
    .set({
      totalReferrals: Number(referrals[0].count),
      totalEarnings: String(parseFloat(earnings[0].total || "0").toFixed(2)),
    })
    .where(eq(affiliatesTable.id, affiliate.id))
    .returning();

  res.json({ success: true, totalReferrals: updated.totalReferrals, totalEarnings: updated.totalEarnings });
});

router.delete("/admin/affiliates/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const deleted = await db.delete(affiliatesTable).where(eq(affiliatesTable.id, id)).returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Affilié introuvable" });
    return;
  }
  res.sendStatus(204);
});

// ── BOT BUTTONS (inline keyboard on /start) ──

router.get("/admin/bot-buttons", requireAdmin, async (_req, res): Promise<void> => {
  await ensureBotButtonsTable();
  const buttons = await db.select().from(botButtonsTable).orderBy(asc(botButtonsTable.sortOrder), asc(botButtonsTable.id));
  res.json({ buttons });
});

router.post("/admin/bot-buttons", requireAdmin, async (req, res): Promise<void> => {
  await ensureBotButtonsTable();
  const { label, url, isWebApp, sortOrder, row } = req.body;
  if (!label?.trim() || !url?.trim()) {
    res.status(400).json({ error: "label et url sont requis" });
    return;
  }
  const [btn] = await db.insert(botButtonsTable).values({
    label: label.trim(),
    url: url.trim(),
    isWebApp: !!isWebApp,
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    row: typeof row === "number" ? row : 0,
    isActive: true,
  }).returning();
  res.status(201).json(btn);
});

router.put("/admin/bot-buttons/:id", requireAdmin, async (req, res): Promise<void> => {
  await ensureBotButtonsTable();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { label, url, isWebApp, sortOrder, row, isActive } = req.body;

  const updates: Record<string, unknown> = {};
  if (typeof label === "string") updates.label = label.trim();
  if (typeof url === "string") updates.url = url.trim();
  if (typeof isWebApp === "boolean") updates.isWebApp = isWebApp;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;
  if (typeof row === "number") updates.row = row;
  if (typeof isActive === "boolean") updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Rien à modifier" });
    return;
  }

  const [updated] = await db.update(botButtonsTable).set(updates).where(eq(botButtonsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Bouton introuvable" });
    return;
  }
  res.json(updated);
});

router.delete("/admin/bot-buttons/:id", requireAdmin, async (req, res): Promise<void> => {
  await ensureBotButtonsTable();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const deleted = await db.delete(botButtonsTable).where(eq(botButtonsTable.id, id)).returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Bouton introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
