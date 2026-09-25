import * as Sentry from '@sentry/node'
// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // v11 default `dataCollection` already collects request headers, IP, cookies,
  // bodies etc., matching the old `sendDefaultPii: true` behavior, so no option is needed:
  // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#dataCollection
})
