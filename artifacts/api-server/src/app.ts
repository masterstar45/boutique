import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { initBot, setMiniAppBaseUrl } from "./lib/telegram-bot";
import { getPublicApiBaseUrl, getPublicMiniAppUrl } from "./lib/public-url";
import { adminLock } from "./middlewares/adminLock";

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

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const publicApiBaseUrl = getPublicApiBaseUrl();
const publicMiniAppUrl = getPublicMiniAppUrl();
const webhookUrl = publicApiBaseUrl ?? undefined;
const miniAppUrl = publicMiniAppUrl ? `${publicMiniAppUrl}/` : undefined;

initBot(webhookUrl);
if (miniAppUrl) setMiniAppBaseUrl(miniAppUrl);

// Emergency admin lock - must be mounted BEFORE the routes so it can block /api/admin
app.use(adminLock);

app.use("/api", router);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..", "public");

try {
  const fs = await import("fs");
  if (fs.existsSync(frontendDir)) {
    logger.info({ frontendDir }, "Serving static frontend");
    app.use(express.static(frontendDir, { maxAge: "1d" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDir, "index.html"));
    });
  }
} catch {
  // no frontend built — dev mode, frontend served by Vite
}

export default app;