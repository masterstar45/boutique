import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    balance: user.balance,
    affiliateCode: user.affiliateCode,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  });
});

router.get("/users/me/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.userId))
    .orderBy(desc(ordersTable.createdAt));

  const result = await Promise.all(orders.map(async (order) => {
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

    return {
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
    };
  }));

  res.json({ orders: result });
});

export default router;
