import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import productsRouter from "./products";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import depositsRouter from "./deposits";
import downloadsRouter from "./downloads";
import promoRouter from "./promo";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";
import storageRouter from "./storage";
import { createRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const authLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30, keyPrefix: "auth" });
const webhookLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 300, keyPrefix: "webhook" });
const downloadsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120, keyPrefix: "downloads" });
const paymentsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 80, keyPrefix: "payments" });
const depositsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 40, keyPrefix: "deposits" });
const uploadsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 40, keyPrefix: "uploads" });

router.use("/auth/telegram", authLimiter);
router.use("/telegram-webhook", webhookLimiter);
router.use("/payment-webhook", webhookLimiter);
router.use("/downloads", downloadsLimiter);
router.use("/payments", paymentsLimiter);
router.use("/deposits", depositsLimiter);
router.use("/storage/uploads", uploadsLimiter);

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(paymentsRouter);
router.use(depositsRouter);
router.use(downloadsRouter);
router.use(promoRouter);
router.use(adminRouter);
router.use(webhooksRouter);
router.use(storageRouter);

export default router;
