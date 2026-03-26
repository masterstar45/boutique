import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initBot, setMiniAppBaseUrl } from "./lib/telegram-bot";
import { getPublicApiBaseUrl, getPublicMiniAppUrl } from "./lib/public-url";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const publicApiBaseUrl = getPublicApiBaseUrl();
const publicMiniAppUrl = getPublicMiniAppUrl();
const webhookUrl = publicApiBaseUrl ?? undefined;
const miniAppUrl = publicMiniAppUrl ? `${publicMiniAppUrl}/` : undefined;

initBot(webhookUrl);
if (miniAppUrl) setMiniAppBaseUrl(miniAppUrl);

app.use("/api", router);

export default app;
