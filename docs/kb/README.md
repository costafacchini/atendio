# Knowledge Base

Curated docs to reduce token usage and improve agent accuracy.
Load ONLY documents relevant to your current task.

## How to Use

1. Read this index
2. Identify matching documents for your task
3. Load only those documents
4. Undocumented pattern discovered? Run `document-solution`

## Index

### Architecture

| Document | When to Read |
|----------|--------------|
| [dependency-injection-runtime-wiring](architecture/dependency-injection-runtime-wiring.md) | Executing `.plans/dependency-injection`, removing concrete repository allocation from runtime code, or migrating controller specs from `mongoServer` |
| [env-vars](architecture/env-vars.md) | Adding or auditing environment variables; setting up a new deployment environment |
| [express-conventions](architecture/express-conventions.md) | Working with Express routes, middleware, or configuration |
| [job-queue-system](architecture/job-queue-system.md) | Working on async jobs, message ordering, worker logic, or feature flags |
| [project-context-pre-setup](architecture/project-context-pre-setup.md) | Historical migrated AGENTS/project context captured before framework setup; useful only when reconciling old instructions |
| [project-overview](architecture/project-overview.md) | Any task — covers project purpose, folder layout, entry points, plugin system, API, deployment |
| [typescript-conventions](architecture/typescript-conventions.md) | Writing TypeScript code |

### Features

| Document | When to Read |
|----------|--------------|
| [baileys-whatsapp-guide](features/baileys-whatsapp-guide.md) | Configuring a Licensee to use the Baileys WhatsApp plugin, QR auth, sending/receiving messages, and the group sync & directory flow |
| [deploy-heroku](features/deploy-heroku.md) | Deploying to Heroku: process types, env vars, scaler setup, Formation API |
| [deploy-fly](features/deploy-fly.md) | Deploying to Fly.io: machines, fly.toml, scaler wiring via Machines API |
| [deploy-ecs](features/deploy-ecs.md) | Deploying to AWS ECS Fargate: task definitions, IAM policy, scaler via UpdateService |
| [local-smoke-workflow](features/local-smoke-workflow.md) | Running the hybrid local smoke stack, seeded demo data, or the scripted pre-deploy smoke verification flow |

### Integrations

| Document | When to Read |
|----------|--------------|
| [bl-v7-bufferliststream-upgrade](integrations/bl-v7-bufferliststream-upgrade.md) | Upgrading `bl` to v7 in this repo or fixing backup/archive code that Jest loads |
| [cra-to-vite-migration](integrations/cra-to-vite-migration.md) | Migrating from CRA (`react-scripts`) to Vite/Vitest, or debugging JSX parse errors / mock failures in Vitest on a `.js`-extension codebase |
| [socketio-jwt-licensee-rooms](integrations/socketio-jwt-licensee-rooms.md) | Adding Socket.IO real-time events, wiring client-side socket subscriptions, or extending the `join-licensee` mechanism |

### API

| Document | When to Read |
|----------|--------------|
| | |

### Bug Fixes

| Document | When to Read |
|----------|--------------|
| [heroku-vite-build-tool-missing](bugfixes/heroku-vite-build-tool-missing.md) | Heroku deploy fails with `vite: not found` after the frontend migration to Vite or when a production-mode nested install prunes build tooling |
| [vite-8-jsx-in-js-tests](bugfixes/vite-8-jsx-in-js-tests.md) | Client Vitest suites fail after a Vite 8 upgrade because `.js` files in `client/src` still contain JSX and the old `esbuild` workaround is ignored |
| [vite-esm-spa-paths-in-express](bugfixes/vite-esm-spa-paths-in-express.md) | Production throws `__dirname is not defined` in Express routes or the server still points at CRA's `client/build` output after the Vite migration |

### Research

| Document | When to Read |
|----------|--------------|
| [centralized-logger-2026](research/centralized-logger-2026.md) | Implementing or modifying the centralized logger using plain JS + Sentry Node SDK v10 |
| [cookie-auth-express5-2026](research/cookie-auth-express5-2026.md) | httpOnly cookie auth for Express 5 or Bull Board authentication |
| [express-validator-v1-2026](research/express-validator-v1-2026.md) | Adding express-validator v7 input validation to v1 API routes |
| [express5-error-handling-2026](research/express5-error-handling-2026.md) | Express 5 error handling middleware and hardened error responses |
| [helmet-express5-2026](research/helmet-express5-2026.md) | Configuring Helmet 8.x security headers with Express 5 |
| [rate-limiting-2026](research/rate-limiting-2026.md) | Adding rate limiting with express-rate-limit |

### AI Patterns

| Document | When to Read |
|----------|--------------|
| [mistake-log](ai-patterns/mistake-log.md) | Session start — avoid repeated errors |
| [trigger-log](ai-patterns/trigger-log.md) | Observability for trigger executions |

### Sessions

| Document | When to Read |
|----------|--------------|
| [sessions/](sessions/) | Continuing paused work |

## Adding Documents

Kebab-case filenames. Place in appropriate category folder.
Each doc must include: **Last Updated**, **Context**, and content sections.

Categories: `architecture/`, `features/`, `integrations/`, `api/`, `bugfixes/`, `ai-patterns/`, `sessions/`
