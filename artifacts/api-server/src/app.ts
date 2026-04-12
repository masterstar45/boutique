import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { initBot, setMiniAppBaseUrl } from "./lib/telegram-bot";
import { getPublicApiBaseUrl, getPublicMiniAppUrl } from "./lib/public-url";

const app: Express = express();

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "script-src 'self' https://challenges.cloudflare.com",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src https://challenges.cloudflare.com",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

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

const rawAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS ?? "";
const allowedOrigins = rawAllowedOrigins.split(",").map(o => o.trim()).filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ALLOWED_ORIGINS must be set in production");
}

app.use(cors({
  origin: allowedOrigins.length > 0
    ? (origin, callback) => {
        // Allow requests with no Origin (mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    : true,
  credentials: true,
}));

// Middleware to capture raw body for HMAC verification
app.use(express.json({
  limit: "10mb",
  verify: (req: any, res: any, buf: Buffer, encoding: any) => {
    // Store the raw body for HMAC verification
    req.rawBody = buf.toString(encoding ?? "utf8");
  },
}));
app.use(express.urlencoded({ extended: true }));

const publicApiBaseUrl = getPublicApiBaseUrl();
const publicMiniAppUrl = getPublicMiniAppUrl();
const webhookUrl = publicApiBaseUrl ?? undefined;
const miniAppUrl = publicMiniAppUrl ? `${publicMiniAppUrl}/` : undefined;

initBot(webhookUrl);
if (miniAppUrl) setMiniAppBaseUrl(miniAppUrl);

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
