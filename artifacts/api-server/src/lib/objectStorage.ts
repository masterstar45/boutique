import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { getPublicApiBaseUrl } from "./public-url";
import { db, fileStorageTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const LOCAL_UPLOADS_DIR = path.resolve(process.env.LOCAL_UPLOADS_DIR || "./local-uploads");

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function createObjectStorageClient(): Storage {
  const gcpProjectId = process.env.GCP_PROJECT_ID?.trim() || undefined;
  const rawServiceAccount = process.env.GCP_SERVICE_ACCOUNT_JSON;

  if (rawServiceAccount) {
    const parsed = JSON.parse(rawServiceAccount) as ServiceAccountCredentials;
    const projectId = gcpProjectId ?? parsed.project_id;

    return new Storage({
      projectId,
      credentials: {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      },
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Storage({ projectId: gcpProjectId });
  }

  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

export const objectStorageClient = createObjectStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  /**
   * Check whether GCS is configured (PRIVATE_OBJECT_DIR is set).
   * When false, we fall back to local filesystem storage.
   */
  isGCSConfigured(): boolean {
    return !!(process.env.PRIVATE_OBJECT_DIR);
  }

  /**
   * Return (and create if needed) the local uploads directory.
   */
  getLocalUploadsDir(): string {
    if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
    }
    return LOCAL_UPLOADS_DIR;
  }

  /**
   * Save a file to PostgreSQL database (persistent across deploys).
   */
  async saveLocalFile(objectId: string, data: Buffer, contentType: string): Promise<void> {
    const base64Data = data.toString('base64');
    await db.insert(fileStorageTable).values({
      objectId,
      data: base64Data,
      contentType,
      size: data.length,
    }).onConflictDoUpdate({
      target: fileStorageTable.objectId,
      set: { data: base64Data, contentType, size: data.length },
    });
    console.error(`[storage] File saved to PostgreSQL: ${objectId} (${data.length} bytes)`);
  }

  /**
   * Serve a file from PostgreSQL. Returns null if not found.
   */
  async serveLocalFile(objectId: string): Promise<{ buffer: Buffer; contentType: string; size: number } | null> {
    const row = await db.select()
      .from(fileStorageTable)
      .where(eq(fileStorageTable.objectId, objectId))
      .then(r => r[0]);
    if (!row) return null;
    const buffer = Buffer.from(row.data, 'base64');
    return { buffer, contentType: row.contentType, size: row.size };
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<{uploadURL: string; objectPath: string}> {
    try {
      const privateObjectDir = this.getPrivateObjectDir();
      if (!privateObjectDir) {
        throw new Error(
          "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
            "tool and set PRIVATE_OBJECT_DIR env var."
        );
      }

      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/uploads/${objectId}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);

      const uploadURL = await signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      });

      const objectPath = this.normalizeObjectEntityPath(uploadURL);
      return { uploadURL, objectPath };
    } catch (err) {
      console.warn("[ObjectStorageService] GCS not available, using local storage fallback:", err);
      // Local fallback: Return an API endpoint URL for direct upload
      const objectId = randomUUID();
      const objectPath = `/objects/uploads/${objectId}`;
      // Build an absolute URL so Zod .url() validation passes
      const publicBase = getPublicApiBaseUrl() || `http://localhost:${process.env.PORT || 5000}`;
      const uploadURL = `${publicBase}/api/storage/uploads/direct/${objectId}`;
      return { uploadURL, objectPath };
    }
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.startsWith("/")) {
      objectEntityDir = `/${objectEntityDir}`;
    }
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async uploadObjectBuffer(buffer: Buffer, contentType: string = 'text/plain'): Promise<string> {
    // Local storage fallback when GCS is not configured
    if (!this.isGCSConfigured()) {
      const objectId = randomUUID();
      await this.saveLocalFile(objectId, buffer, contentType);
      return `/objects/uploads/${objectId}`;
    }
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(buffer, { contentType, metadata: { contentType } });
    return `/objects/uploads/${objectId}`;
  }

  /**
   * List all files in the local uploads directory (for diagnostics).
   */
  listLocalFiles(): Array<{ id: string; size: number }> {
    const dir = this.getLocalUploadsDir();
    return fs.readdirSync(dir)
      .filter(f => !f.endsWith('.meta.json'))
      .map(f => ({ id: f, size: fs.statSync(path.join(dir, f)).size }));
  }

  async readObjectBuffer(objectPath: string): Promise<Buffer> {
    // PostgreSQL storage fallback when GCS is not configured
    if (!this.isGCSConfigured()) {
      const parts = objectPath.replace(/^\/objects\//, '').split('/');
      const objectId = parts[parts.length - 1];

      console.error(`[storage] readObjectBuffer: looking for "${objectId}" in PostgreSQL`);

      const row = await db.select()
        .from(fileStorageTable)
        .where(eq(fileStorageTable.objectId, objectId))
        .then(r => r[0]);

      if (row) {
        console.error(`[storage] readObjectBuffer: found in PostgreSQL (${row.size} bytes)`);
        return Buffer.from(row.data, 'base64');
      }

      // Fallback: try local filesystem (for backward compat with existing local files)
      const dir = this.getLocalUploadsDir();
      const filePath = path.join(dir, objectId);
      if (fs.existsSync(filePath)) {
        console.error(`[storage] readObjectBuffer: found on local disk as fallback`);
        return fs.readFileSync(filePath);
      }

      console.error(`[storage] readObjectBuffer: NOT FOUND in PostgreSQL or local disk`);
      throw new ObjectNotFoundError();
    }
    const file = await this.getObjectEntityFile(objectPath);
    const [contents] = await file.download();
    return contents;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const json = (await response.json()) as { signed_url?: string };
  const signedURL = json.signed_url;
  if (!signedURL) {
    throw new Error("Failed to sign object URL: signed_url missing in response");
  }
  return signedURL;
}
