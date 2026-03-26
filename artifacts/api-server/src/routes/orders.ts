import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productsTable, promoCodesTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const { items, promoCode, affiliateCode } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Panier vide" });
    return;
  }

  const productIds = items.map((i: { productId: number }) => i.productId);
  const products = await db.select().from(productsTable)
    .where(and(
      inArray(productsTable.id, productIds),
      eq(productsTable.isActive, true)
    ));

  if (products.length !== productIds.length) {
    res.status(400).json({ error: "Un ou plusieurs produits sont invalides" });
    return;
  }

  let totalAmount = 0;
  const orderItems = items.map((item: { productId: number; quantity: number; selectedOptionLabel?: string }) => {
    const product = products.find(p => p.id === item.productId)!;
    const opts = (product.priceOptions as Array<{ label: string; price: string; quantity: string }> | null) ?? [];

    let optionPrice = parseFloat(product.price);
    let recordQuantity = 0;
    let selectedOptionLabel: string | null = null;

    if (item.selectedOptionLabel && opts.length > 0) {
      const requested = String(item.selectedOptionLabel).trim().toLowerCase();
      const match = opts.find(o => String(o.label ?? "").trim().toLowerCase() === requested);
      if (match) {
        optionPrice = parseFloat(match.price);
        recordQuantity = parseInt(match.quantity ?? "0", 10) || 0;
        selectedOptionLabel = match.label;
      } else {
        const first = opts[0];
        optionPrice = parseFloat(first.price);
        recordQuantity = parseInt(first.quantity ?? "0", 10) || 0;
        selectedOptionLabel = first.label;
      }
    } else if (opts.length > 0) {
      const first = opts[0];
      optionPrice = parseFloat(first.price);
      recordQuantity = parseInt(first.quantity ?? "0", 10) || 0;
      selectedOptionLabel = first.label;
    }

    totalAmount += optionPrice * (item.quantity ?? 1);
    return {
      productId: item.productId,
      quantity: item.quantity ?? 1,
      price: optionPrice.toFixed(2),
      selectedOptionLabel,
      recordQuantity,
    };
  });

  let discountAmount = 0;
  let validPromoCode: string | undefined;

  if (promoCode) {
    const promo = await db.select().from(promoCodesTable)
      .where(and(
        eq(promoCodesTable.code, promoCode.toUpperCase()),
        eq(promoCodesTable.isActive, true)
      ))
      .then(r => r[0]);

    if (promo) {
      const minOrder = parseFloat(promo.minOrderAmount ?? "0");
      if (totalAmount >= minOrder) {
        if (promo.discountType === "percent") {
          discountAmount = totalAmount * parseFloat(promo.discountValue) / 100;
        } else {
          discountAmount = parseFloat(promo.discountValue);
        }
        validPromoCode = promoCode.toUpperCase();

        if (!promo.maxUses || promo.currentUses < promo.maxUses) {
          await db.update(promoCodesTable)
            .set({ currentUses: promo.currentUses + 1 })
            .where(eq(promoCodesTable.id, promo.id));
        }
      }
    }
  }

  const finalAmount = Math.max(0, totalAmount - discountAmount);

  const [order] = await db.insert(ordersTable).values({
    userId: req.user!.userId,
    status: "pending",
    amount: finalAmount.toFixed(2),
    promoCode: validPromoCode ?? null,
    discountAmount: discountAmount.toFixed(2),
    affiliateCode: affiliateCode ?? null,
  }).returning();

  const itemsWithOrderId = orderItems.map(item => ({
    ...item,
    orderId: order.id,
  }));

  await db.insert(orderItemsTable).values(itemsWithOrderId);

  const savedItems = await db.select({
    id: orderItemsTable.id,
    productId: orderItemsTable.productId,
    productName: productsTable.name,
    quantity: orderItemsTable.quantity,
    price: orderItemsTable.price,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  res.status(201).json({
    id: order.id,
    userId: order.userId,
    status: order.status,
    amount: order.amount,
    promoCode: order.promoCode,
    discountAmount: order.discountAmount,
    items: savedItems.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName ?? "Produit",
      quantity: i.quantity,
      price: i.price,
    })),
    createdAt: order.createdAt,
  });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const order = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, req.user!.userId)))
    .then(r => r[0]);

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const items = await db.select({
    id: orderItemsTable.id,
    productId: orderItemsTable.productId,
    productName: productsTable.name,
    quantity: orderItemsTable.quantity,
    price: orderItemsTable.price,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  res.json({
    id: order.id,
    userId: order.userId,
    status: order.status,
    amount: order.amount,
    promoCode: order.promoCode,
    discountAmount: order.discountAmount,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName ?? "Produit",
      quantity: i.quantity,
      price: i.price,
    })),
    createdAt: order.createdAt,
  });
});

export default router;
