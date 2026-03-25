import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initBot, setMiniAppBaseUrl } from "./lib/telegram-bot";

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

const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
const webhookUrl = domains ? `https://${domains}` : undefined;
const miniAppUrl = domains ? `https://${domains}/` : undefined;

initBot(webhookUrl);
if (miniAppUrl) setMiniAppBaseUrl(miniAppUrl);

app.use("/api", router);

export default app;
