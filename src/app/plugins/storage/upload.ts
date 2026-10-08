import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '../../helpers/logger'

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH ?? '/app/uploads'
const APP_URL = process.env.APP_URL ?? 'http://localhost:5001'

function buildRelativePath(contactNumber: string, fileName: string): string {
  const date = new Date()
  const folder = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  return path.join(folder, contactNumber, fileName)
}

// Encodes each path segment individually so filenames with spaces/special characters
// (e.g. "Screenshot 2026-10-07 at 14.21.05.png") produce a valid, browser-safe URL.
function encodeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).map(encodeURIComponent).join('/')
}

// eslint-disable-next-line require-await
async function uploadFileLocal(buffer: Buffer, relativePath: string): Promise<string> {
  const fullPath = path.join(LOCAL_STORAGE_PATH, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, buffer)
  logger.info(`LocalStorage: arquivo salvo em ${fullPath}`)
  return `${APP_URL}/uploads/${encodeRelativePath(relativePath)}`
}

async function uploadFileS3(buffer: Buffer, relativePath: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    ...(process.env.AWS_ENDPOINT_URL && {
      endpoint: process.env.AWS_ENDPOINT_URL,
      forcePathStyle: true,
    }),
  })
  const bucket = process.env.AWS_BUCKET_NAME as string

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: relativePath,
        Body: buffer,
        ACL: 'public-read',
        ContentType: mime.lookup(relativePath) || 'application/octet-stream',
      }),
    )
  } catch (error) {
    logger.error('AWS: Erro ao enviar arquivo para S3', error)
    throw new Error('Erro ao enviar arquivo para S3', { cause: error })
  }

  // AWS_ENDPOINT_URL may be a container-internal hostname (e.g. host.docker.internal) that the
  // SDK needs to reach MinIO, but that browsers rendering the stored URL can't resolve.
  // AWS_PUBLIC_URL lets that be overridden with a browser-reachable address; falls back to
  // AWS_ENDPOINT_URL when unset (e.g. real AWS S3 with a custom endpoint already public).
  const encodedPath = encodeRelativePath(relativePath)
  const publicEndpoint = process.env.AWS_PUBLIC_URL || process.env.AWS_ENDPOINT_URL
  if (publicEndpoint) return `${publicEndpoint}/${bucket}/${encodedPath}`
  return `https://${bucket}.s3.amazonaws.com/${encodedPath}`
}

export function uploadFile(buffer: Buffer, fileName: string, contact: { number: string }): Promise<string> {
  const relativePath = buildRelativePath(contact.number, fileName)
  const provider = process.env.STORAGE_PROVIDER ?? 'local'
  if (provider === 's3') return uploadFileS3(buffer, relativePath)
  return uploadFileLocal(buffer, relativePath)
}
