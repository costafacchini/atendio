# Plans

Git-native Markdown plans for multi-step work.

```
.plans/
+-- plan-slug/
    +-- overview.md              # Objective, scope, phase/task summary, success criteria
    +-- phase-N/
        +-- task-NN-slug.md      # Full task spec
        +-- task-NN-slug/
            +-- status.md        # Live status tracking
```

**Lifecycle**: not-started → in-progress → complete
**Skills**: `create-plan`, `execute-task`, `execute-plan`
**Rule**: Each task completable in one session. No file ownership overlaps.

---

## Active Plans

| # | Plan | Folder | Status | Description |
|---|------|--------|--------|-------------|
| 5 | [Ecomanda Fly.io Deploy](./ecomanda-flyio/overview.md) | `ecomanda-flyio/` | not-started | Deploy on Fly.io single 1 GB VM (server + worker), replacing Heroku — 3 phases, 4 tasks |
| 7 | [Schedule Message](./schedule-message/overview.md) | `schedule-message/` | not-started | Allow agents to schedule a Chat message for future delivery via BullMQ delay — 3 phases, 8 tasks |

---

## Completed Plans

| # | Plan | Folder | Completed | Description |
|---|------|--------|-----------|-------------|
| 1 | [Use Cases](./use-cases/overview.md) | `use-cases/` | 2026-04-29 | Extract business logic from controllers into dedicated use case classes; controllers become thin (validate → execute → respond) |
| 2 | [JS → TypeScript](./js-to-ts/overview.md) | `js-to-ts/` | 2026-05-31 | Incremental migration of all source files (backend + client) to TypeScript; strict: true; @typescript-eslint/recommended |
| 3 | [Security Hardening](./security-hardening/overview.md) | `security-hardening/` | 2026-06-01 | Helmet, CORS, rate limiting, Bull Board auth, error hardening, JWT fix, RBAC, centralized logger, v1 input validation |
| 2 | [Baileys WhatsApp Plugin](./baileys-plugin/overview.md) | `baileys-plugin/` | 2026-05-05 | Add Baileys-based WhatsApp messenger plugin with session persistence (WhatsappSession model), following the Dialog plugin architecture |
| 3 | [Licensee Form Wizard](./licensee-form-wizard/overview.md) | `licensee-form-wizard/` | 2026-05-07 | Split the licensee form into Bootstrap 5 Nav Tabs with panels shown/hidden based on question checkboxes; removed per-licensee AWS fields |
| 4 | [Licensee Create Wizard](./licensee-wizard/overview.md) | `licensee-wizard/` | 2026-05-07 | Multi-step wizard for New Licensee (7 steps, Yes/No gates); removed question checkboxes from Edit form |
| 5 | [Dashboard Widgets](./dashboard-widgets/overview.md) | `dashboard-widgets/` | 2026-05-07 | Role-aware dashboard: 5 super cards + 3 licensee cards, per-card REST endpoints, Redis caching, resend modal |
| 6 | [Baileys Group Messaging & Directory Sync](./baileys-groups-directory/overview.md) | `baileys-groups-directory/` | 2026-05-16 | Extend the existing Baileys plugin to import WhatsApp groups into Contacts and send outbound messages to group JIDs |
| 7 | [Baileys Socket Monitor](./baileys-socket-monitor/overview.md) | `baileys-socket-monitor/` | 2026-06-02 | Replace webhook-only inbound flow with a persistent Baileys socket per licensee; captures messages.upsert and messages.update natively |
| 8 | [Local Chat Infrastructure](./local-chat-infra/overview.md) | `local-chat-infra/` | 2026-06-02 | User role system (agent/supervisor/admin/super), LocalChat plugin, super licensee flow, route authorization |
| 9 | [Remove PDV](./remove-pdv/overview.md) | `remove-pdv/` | 2026-06-01 | Delete cart, payment (PagarMe), and order integration (Pedidos10) domain — strip PDV fields from Licensee and Contact |
| 10 | [Baileys Socket Monitor](./baileys-socket-monitor/overview.md) | `baileys-socket-monitor/` | 2026-06-02 | Replace webhook-only inbound flow with a persistent Baileys socket per licensee; captures messages.upsert and messages.update natively |
| 11 | [Local Chat Infrastructure](./local-chat-infra/overview.md) | `local-chat-infra/` | 2026-06-02 | User role system (agent/supervisor/admin/super), LocalChat plugin, super licensee flow, route authorization — prerequisite for setores |
| 12 | [Onboarding Wizard](./onboarding-wizard/overview.md) | `onboarding-wizard/` | 2026-06-02 | Public sign-up flow from the login screen: wizard modal collects licensee identity + user credentials and creates both via a single unauthenticated endpoint |
| 13 | [Setores](./setores/overview.md) | `setores/` | 2026-06-10 | Multiple WhatsApp numbers per licensee via sectors; sector-scoped message routing and agent access filtering |
| 14 | [Setores — Webhook Providers](./setores-webhook-providers/overview.md) | `setores-webhook-providers/` | 2026-06-11 | sectorToken + webhookUrl virtual on Sector; auth middleware resolves ?sector= query param; MessengersController threads sectorId |
| 15 | [Client Type Narrowing](./type-client/overview.md) | `type-client/` | 2026-06-17 | Replace `any` with interfaces across React services, contexts, pages, and components — 2 phases, 6 tasks |
| 16 | [Local Chat UI](./local-chat-ui/overview.md) | `local-chat-ui/` | 2026-06-17 | Agent-facing full-screen chat page at /chat: rooms API, sector-aware filtering, Nova conversa, Socket.IO real-time updates |
| 17 | [Chat Widget](./chat-widget/overview.md) | `chat-widget/` | 2026-06-22 | Embeddable Intercom-style widget for external sites; React+Vite IIFE bundle, 3 public API endpoints, polling replies, LocalChat integration — 4 phases, 11 tasks |
| 18 | [App Internationalization (PT/EN)](./app-i18n/overview.md) | `app-i18n/` | 2026-06-24 | PT/EN language selection on login + onboarding, persisted in user.language, applied app-wide — 3 phases, 9 tasks |
| 19 | [Inbox Concept](./inbox-concept/overview.md) | `inbox-concept/` | 2026-07-25 | Inbox entity so licensees can operate multiple WhatsApp numbers and chat instances independently; departments link to messenger inboxes — 4 phases, 7 tasks |
| 20 | [Ecomanda Docker](./ecomanda-docker/overview.md) | `ecomanda-docker/` | 2026-07-25 | Dockerfile, local dev docker-compose, and LocalStorage provider as S3 alternative — 2 phases, 4 tasks |
| 21 | [Prisma Dashboard & Rooms Migration](./prisma-dashboard-rooms/overview.md) | `prisma-dashboard-rooms/` | 2026-08-12 | Replace Mongoose .model() API in DashboardController and RoomsController with Prisma/PostgreSQL repository methods — 2 phases, 6 tasks |
| 22 | [MongoDB → PostgreSQL](./mongo-to-postgres/overview.md) | `mongo-to-postgres/` | 2026-08-08 | Migrate all persistent data from MongoDB/Mongoose to PostgreSQL/Prisma using dual-write strategy |
| 23 | [Backend Type Narrowing](./type-backend/overview.md) | `type-backend/` | 2026-08-07 | Replace `any` with interfaces across models, repositories, use cases, controllers, and plugins — 3 phases, 11 tasks |
| 24 | [Remove Plugin Fields from Licensee](./licensee-plugin-fields-to-inbox/overview.md) | `licensee-plugin-fields-to-inbox/` | 2026-08-13 | Remove 7 plugin fields from Licensee model; migrate all consumers to read from Inbox instead — 3 phases, 6 tasks |

---

## Execution Order

```
use-cases (complete) → js-to-ts (complete)
                              ↓
                       remove-pdv → mongo-to-postgres
```

`remove-pdv` should complete before `type-backend` / `type-client` to avoid typing code that will be deleted.
`security-hardening`, `baileys-socket-monitor`, `local-chat-infra`, and `setores` are independent and can run in parallel.
