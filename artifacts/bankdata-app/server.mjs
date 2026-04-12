import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 8080);
const host = "0.0.0.0";
const distDir = join(process.cwd(), "artifacts", "bankdata-app", "dist");
const indexPath = join(distDir, "index.html");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "script-src 'self' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src https://challenges.cloudflare.com",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}

function sendFile(res, absolutePath, cacheControl) {
  const ext = extname(absolutePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";
  const size = statSync(absolutePath).size;

  setSecurityHeaders(res);
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Length", String(size));
  res.setHeader("Cache-Control", cacheControl);

  createReadStream(absolutePath).pipe(res);
}

function resolveSafePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = normalize(decoded).replace(/^([.]{2}[/\\])+/, "");
  return join(distDir, normalizedPath);
}

const server = createServer((req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const urlPath = req.url || "/";
  let filePath = resolveSafePath(urlPath);

  if (urlPath === "/" || urlPath === "") {
    filePath = indexPath;
  }

  const isAsset = filePath.includes(join(distDir, "assets"));
  const fileExists = existsSync(filePath);

  if (fileExists && !filePath.endsWith("/")) {
    const cache = isAsset ? "public, max-age=31536000, immutable" : "no-cache";
    sendFile(res, filePath, cache);
    return;
  }

  // SPA fallback
  if (existsSync(indexPath)) {
    sendFile(res, indexPath, "no-cache");
    return;
  }

  res.statusCode = 404;
  res.end("Not Found");
});

server.listen(port, host, () => {
  console.log(`[bankdata-app] Listening on http://${host}:${port}`);
});
