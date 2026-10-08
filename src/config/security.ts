const isDev = process.env.NODE_ENV !== 'production'

// Uploaded files (LocalChat file messages) are served from whichever storage origin
// STORAGE_PROVIDER points at — a different origin than the app itself when using S3/MinIO.
function storageImgSrcOrigins(): string[] {
  const candidates = [process.env.AWS_PUBLIC_URL, process.env.AWS_ENDPOINT_URL, process.env.APP_URL]
  const origins = candidates
    .filter((value): value is string => !!value)
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    })
    .filter((value): value is string => !!value)

  if (process.env.AWS_BUCKET_NAME) {
    origins.push(`https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com`)
  }

  return Array.from(new Set(origins))
}

export function helmetConfig() {
  const storageOrigins = storageImgSrcOrigins()
  // Forcing the upgrade would break any storage origin that only serves plain HTTP
  // (e.g. a local MinIO instance with no TLS listener on its S3 port).
  const hasInsecureStorageOrigin = storageOrigins.some((origin) => origin.startsWith('http://'))

  return {
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', ...storageOrigins],
        'media-src': ["'self'", 'data:', 'blob:', ...storageOrigins],
        'font-src': ["'self'", 'https:', 'data:'],
        'connect-src': ["'self'", isDev ? 'ws://localhost:*' : null, isDev ? 'http://localhost:*' : null].filter(
          Boolean,
        ),
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        // null disables this directive in dev — Safari upgrades http://localhost to https:// otherwise.
        // Also disabled whenever an allowed storage origin is plain HTTP (e.g. local MinIO), since
        // forcing the upgrade there breaks the request rather than securing it.
        'upgrade-insecure-requests': isDev || hasInsecureStorageOrigin ? null : ([] as any[]),
      },
    },
    strictTransportSecurity: isDev ? false : { maxAge: 31536000, includeSubDomains: true },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }
}
