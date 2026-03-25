import { Router, type IRouter } from "express";
import { db, productsTable, ordersTable, orderItemsTable, usersTable, promoCodesTable, affiliatesTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { sendAdminCreditNotification } from "../lib/telegram-bot";

const router: IRouter = Router();

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

  const [product] = await db.insert(productsTable).values({
    name,
    description,
    price,
    priceOptions: priceOptions ?? [],
    stock: stock ?? 0,
    fileUrl: fileUrl ?? null,
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

  const price = computeBasePrice(priceOptions);

  const [product] = await db.update(productsTable).set({
    name, description, price,
    priceOptions: priceOptions ?? [],
    stock: stock ?? 0,
    fileUrl, fileName, fileType, fileSize, categoryId,
    tags: tags ?? [],
    imageUrl, isActive, isFeatured, isBestSeller, isNew,
    downloadLimit, downloadExpiry,
  }).where(eq(productsTable.id, id)).returning();

  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

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

export default router;
