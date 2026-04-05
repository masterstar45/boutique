import { Router, type IRouter } from "express";
import { db, downloadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

router.get("/downloads/:token", requireAuth, async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  if (!/^[a-f0-9]{128}$/i.test(token)) {
    res.status(400).json({ error: "Format de token invalide" });
    return;
  }

  const download = await db.select().from(downloadsTable)
    .where(eq(downloadsTable.token, token))
    .then(r => r[0]);

  if (!download) {
    res.status(404).json({ error: "Lien de téléchargement invalide" });
    return;
  }

  if (download.userId !== req.user!.userId) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  if (new Date() > download.expiresAt) {
    res.status(403).json({ error: "Lien expiré" });
    return;
  }

  if (download.downloadCount >= download.maxDownloads) {
    res.status(403).json({ error: "Limite de téléchargements atteinte" });
    return;
  }

  const servePath = download.generatedFileUrl ?? null;
  const fileName = download.generatedFileName ?? null;

  if (!servePath) {
    res.status(404).json({ error: "Fichier extrait introuvable — contactez le support" });
    return;
  }

  await db.update(downloadsTable).set({
    downloadCount: download.downloadCount + 1,
    lastDownloadedAt: new Date(),
  }).where(eq(downloadsTable.id, download.id));

  try {
    const file = await storageService.getObjectEntityFile(servePath);
    const response = await storageService.downloadObject(file);

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const dispositionName = (fileName ?? 'fichier.txt').replace(/["\r\n\\]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${dispositionName}"`);
    res.setHeader('Content-Type', response.headers.get('Content-Type') ?? 'text/plain');
    const cl = response.headers.get('Content-Length');
    if (cl) res.setHeader('Content-Length', cl);

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Fichier introuvable en stockage" });
    } else {
      res.status(500).json({ error: "Erreur lors du téléchargement" });
    }
  }
});

export default router;
