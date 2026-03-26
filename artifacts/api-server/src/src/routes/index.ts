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

const router: IRouter = Router();

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
