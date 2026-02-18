import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy initialization of R2 client
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint) {
    throw new Error('R2_ENDPOINT or R2_ACCOUNT_ID is required');
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return _r2Client;
}

function getBucket(): string {
  return process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || '';
}

function getPublicUrlBase(): string {
  return process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
}

// Generate unique R2 key for assets
export function generateR2Key(
  workspaceSlug: string,
  assetType: 'ref' | 'gen' | 'thumb',
  assetId: string,
  extension: string = 'jpg'
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `ws/${workspaceSlug}/${assetType}/${year}/${month}/${assetId}.${extension}`;
}

// Upload buffer to R2
export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await getR2Client().send(command);
  return `${getPublicUrlBase()}/${key}`;
}

// Upload base64 image to R2
export async function uploadBase64ToR2(
  key: string,
  base64Data: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  return uploadBufferToR2(key, buffer, contentType);
}

// Get object from R2 as buffer
export async function getObjectFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  const response = await getR2Client().send(command);
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Get object as base64
export async function getObjectAsBase64(key: string): Promise<string> {
  const buffer = await getObjectFromR2(key);
  return buffer.toString('base64');
}

// Delete object from R2
export async function deleteObjectFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  await getR2Client().send(command);
}

// Generate presigned URL for upload
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'image/jpeg',
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

// Generate presigned URL for download
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

// Get public URL for an asset
export function getPublicUrl(key: string): string {
  return `${getPublicUrlBase()}/${key}`;
}
