import { Router, type IRouter } from "express";
import { db, promoCodesTable, affiliatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/promo/validate", requireAuth, async (req, res): Promise<void> => {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400).json({ error: "Code requis" });
    return;
  }

  const promo = await db.select().from(promoCodesTable)
    .where(and(
      eq(promoCodesTable.code, code.toUpperCase()),
      eq(promoCodesTable.isActive, true)
    ))
    .then(r => r[0]);

  if (!promo) {
    res.status(404).json({ error: "Code promo invalide ou expiré" });
    return;
  }

  if (promo.expiresAt && new Date() > promo.expiresAt) {
    res.status(404).json({ error: "Code promo expiré" });
    return;
  }

  if (promo.maxUses && promo.currentUses >= promo.maxUses) {
    res.status(404).json({ error: "Code promo épuisé" });
    return;
  }

  const minOrder = parseFloat(promo.minOrderAmount ?? "0");
  const amount = parseFloat(orderAmount ?? "0");
  if (amount < minOrder) {
    res.status(400).json({ error: `Commande minimum de ${minOrder} €` });
    return;
  }

  let discountAmount = 0;
  if (promo.discountType === "percent") {
    discountAmount = amount * parseFloat(promo.discountValue) / 100;
  } else {
    discountAmount = parseFloat(promo.discountValue);
  }

  res.json({
    valid: true,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount: Math.min(discountAmount, amount),
  });
});

router.get("/affiliate/stats", requireAuth, async (req, res): Promise<void> => {
  const affiliate = await db.select().from(affiliatesTable)
    .where(eq(affiliatesTable.userId, req.user!.userId))
    .then(r => r[0]);

  if (!affiliate) {
    res.json({
      code: `REF${req.user!.userId}`,
      totalReferrals: 0,
      totalEarnings: "0.00",
      commissionRate: "10.00",
    });
    return;
  }

  res.json({
    code: affiliate.code,
    totalReferrals: affiliate.totalReferrals,
    totalEarnings: affiliate.totalEarnings,
    commissionRate: affiliate.commissionRate,
  });
});

export default router;
