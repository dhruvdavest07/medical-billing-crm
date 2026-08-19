import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presignGetUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

export const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  txt: ["text/plain"],
};

export const ALLOWED_EXTENSIONS = Object.keys(EXTENSION_TO_MIME);
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL = 60 * 60;

export interface UploadResult {
  key: string;
  url: string;
}

export interface FileStorage {
  upload(file: File, key: string): Promise<UploadResult>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export function validateFile(file: File): void {
  if (file.size === 0) {
    throw new StorageValidationError(`File "${file.name}" is empty.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    const mb = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    throw new StorageValidationError(`File "${file.name}" exceeds the ${mb}MB size limit.`);
  }
  const ext = extensionOf(file.name);
  const allowedMimes = EXTENSION_TO_MIME[ext];
  if (!allowedMimes) {
    throw new StorageValidationError(
      `File type ".${ext || "?"}" is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}.`
    );
  }
  if (file.type && !allowedMimes.includes(file.type.toLowerCase())) {
    throw new StorageValidationError(
      `File "${file.name}" has a MIME type ("${file.type}") that does not match its extension (".${ext}").`
    );
  }
}

export function generateStorageKey(
  orgId: string,
  orderId: string | null,
  patientId: string,
  filename: string,
): string {
  const scope = orderId ?? patientId;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${orgId}/${scope}/${randomUUID()}-${safeName}`;
}

class S3Storage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly forcePathStyle: boolean;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    if (!bucket) throw new Error("S3_BUCKET is required to use S3Storage.");
    if (!region) throw new Error("S3_REGION is required to use S3Storage.");
    this.bucket = bucket;
    this.region = region;
    this.endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    this.forcePathStyle = Boolean(this.endpoint);
    this.client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      ...(this.endpoint ? { endpoint: this.endpoint } : {}),
      ...(this.forcePathStyle ? { forcePathStyle: true } : {}),
    });
  }

  private objectUrl(key: string): string {
    if (this.endpoint) return `${this.endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async upload(file: File, key: string): Promise<UploadResult> {
    const body = Buffer.from(await file.arrayBuffer());
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket, Key: key, Body: body,
        ContentType: file.type || undefined, ContentLength: file.size,
      })
    );
    return { key, url: this.objectUrl(key) };
  }

  async getSignedUrl(key: string, expiresIn = DEFAULT_SIGNED_URL_TTL): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return presignGetUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

class LocalStorage implements FileStorage {
  private readonly baseDir = join(process.cwd(), "uploads");

  private pathFor(key: string): string {
    return join(this.baseDir, key);
  }

  async upload(file: File, key: string): Promise<UploadResult> {
    const filePath = this.pathFor(key);
    await mkdir(dirname(filePath), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    return { key, url: `/uploads/${key}` };
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/uploads/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    try { await unlink(this.pathFor(key)); } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

let cached: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (cached) return cached;
  cached = process.env.S3_BUCKET ? new S3Storage() : new LocalStorage();
  return cached;
}

export function __resetStorageForTests(): void {
  cached = null;
}
