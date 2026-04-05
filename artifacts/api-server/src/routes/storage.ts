import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * 
 * Requires: JWT authentication (Bearer token)
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const result = await objectStorageService.getObjectEntityUploadURL();
    
    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * PUT /storage/uploads/direct/:id
 *
 * Direct file upload endpoint used as fallback when GCS is not configured.
 * The client PUTs the raw file body to this endpoint instead of a GCS presigned URL.
 *
 * Requires: JWT authentication (Bearer token)
 */
router.put("/storage/uploads/direct/:id", requireAuth, express.raw({ type: '*/*', limit: '10mb' }), async (req: Request, res: Response) => {
  try {
    const objectId = req.params.id;
    // Validate objectId is a UUID to prevent path traversal
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objectId)) {
      res.status(400).json({ error: "Invalid object ID" });
      return;
    }

    const data = req.body as Buffer;
    if (!data || data.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }

    const contentType = (req.headers['content-type'] as string) || 'application/octet-stream';
    await objectStorageService.saveLocalFile(objectId, data, contentType);

    req.log.info({ objectId, size: data.length, contentType }, "Local file uploaded");
    res.status(200).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error saving direct upload");
    res.status(500).json({ error: "Failed to save upload" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    // Local filesystem fallback when GCS is not configured
    if (!objectStorageService.isGCSConfigured()) {
      const parts = wildcardPath.split('/');
      const objectId = parts[parts.length - 1];
      // Validate objectId is a UUID to prevent path traversal
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objectId)) {
        res.status(400).json({ error: "Invalid object path" });
        return;
      }
      const localFile = await objectStorageService.serveLocalFile(objectId);
      if (!localFile) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      res.setHeader('Content-Type', localFile.contentType);
      res.setHeader('Content-Length', String(localFile.size));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(localFile.buffer);
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
