# Palnadu Smart Pricing – Operational System Runbook

## 1. System Architecture & Hosting Topology

Palnadu Smart Pricing is architected as an independent, modular monorepo deployed across cloud services according to the approved topology:

```
[ Customer / Guest Browser ]              [ Admin Client Browser ]
              │                                        │
              ▼                                        ▼
  [ apps/storefront (Vercel) ]             [ apps/admin (Vercel) ]
              │                                        │
              └───────────────┬────────────────────────┘
                              │ (HTTPS REST API / Webhooks)
                              ▼
                    [ apps/api (Render) ]
                       │              │
                  (Drizzle ORM)  (Cloudinary SDK)
                       ▼              ▼
           [ Prisma Postgres DB ]  [ Cloudinary CDN ]
```

- **`apps/storefront`**: Next.js 15 customer presentation layer deployed to **Vercel**. Provides the public product catalogue with hidden prices/discounts, responsive Quote Cart, and quotation request submission.
- **`apps/admin`**: Next.js 15 administrative application deployed to **Vercel**. Provides catalogue management, price/discount rule configuration, quotation review & WhatsApp delivery tracking, and system integration settings.
- **`apps/api`**: Fastify 5 REST API deployed to **Render**. Handles authentication, RBAC, pricing calculations, quotation persistence, and automated Meta WhatsApp Cloud API messaging.
- **`apps/web`**: Consolidated legacy application retained during migration verification until standalone applications pass acceptance.
- **`packages/persistence`**: Data access layer built with Drizzle ORM and `postgres.js` driver. Single source of truth for database schemas and migrations.
- **`packages/contracts`**: Shared Zod schemas and TypeScript contracts consumed by all applications.
- **`packages/server-config`**: Centralized, validated environment configuration schema.

---

## 2. Database Architecture & Staging Configuration

### 2.1 Managed PostgreSQL with Prisma Postgres

Palnadu Smart Pricing uses managed PostgreSQL (Prisma Postgres staging instance `palnadu-smart-pricing-staging` in `ap-southeast-1` or equivalent standard PostgreSQL 16+ instance).

- **Preservation of Drizzle ORM**: The repository strictly uses Drizzle ORM and `postgres.js`. Prisma ORM is **not** installed and no Prisma schema files are introduced. Drizzle ORM remains the single source of truth.
- **Dual-URL Connection Strategy**:
  1. **Pooled Runtime Connection (`DATABASE_URL`)**:
     - Connects via PgBouncer / Prisma connection pooler.
     - Used by the API server at runtime.
     - Enforces connection pooling (`DB_POOL_MAX=5`) to prevent connection exhaustion.
  2. **Direct Migration Connection (`DATABASE_DIRECT_URL`)**:
     - Direct connection to PostgreSQL port bypassing the connection pooler.
     - Used by `drizzle-kit` during schema migrations (`pnpm db:migrate`) to permit transactional DDL statements.
- **SSL / TLS Enforcement**:
  - In production and cloud environments, SSL is enforced (`DB_SSL=require`).
  - Connections to cloud providers (`*.prisma.io`, `*.render.com`, etc.) automatically require SSL.
  - Local development and test environments default to unencrypted connections (`127.0.0.1:5432`).
- **Test Database Isolation**:
  - Automated tests require a separate disposable database (`TEST_DATABASE_URL`).
  - Automated unit tests (`pnpm test:unit`) run without PostgreSQL.
  - Tests never connect to or mutate staging or production databases.

---

## 3. Environment Variables & Secret Management

All sensitive secrets must be configured via cloud environment variables (e.g., Render Dashboard Secret Management) and **never** committed to version control.

### 3.1 API Service (`apps/api` — Render)

| Variable                | Type   | Default       | Description                                                   |
| ----------------------- | ------ | ------------- | ------------------------------------------------------------- |
| `NODE_ENV`              | String | `development` | Set to `production` in production environments                |
| `HOST`                  | String | `127.0.0.1`   | Network interface (`0.0.0.0` on Render)                       |
| `PORT`                  | Number | `3001`        | HTTP port for Fastify server                                  |
| `LOG_LEVEL`             | String | `info`        | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`) |
| `DATABASE_URL`          | String | _Required_    | PostgreSQL connection URL (pooled)                            |
| `DATABASE_DIRECT_URL`   | String | _Optional_    | PostgreSQL direct connection URL (for migrations)             |
| `DB_POOL_MAX`           | Number | `5`           | Maximum pooled database connections                           |
| `DB_SSL`                | String | `require`     | SSL mode (`require`, `prefer`, `disable`)                     |
| `SESSION_SECRET`        | String | _Required_    | High-entropy session secret ($\ge 32$ characters)             |
| `SESSION_TTL_HOURS`     | Number | `12`          | Admin session cookie lifespan                                 |
| `ALLOWED_ORIGINS`       | String | _Optional_    | Comma-separated allowed frontend origins for CORS/CSRF        |
| `STORAGE_DRIVER`        | String | `cloudinary`  | Media storage driver (`memory`, `disk`, or `cloudinary`)      |
| `CLOUDINARY_CLOUD_NAME` | String | _Optional_    | Cloudinary cloud name for product media storage               |
| `CLOUDINARY_API_KEY`    | String | _Optional_    | Cloudinary API key                                            |
| `CLOUDINARY_API_SECRET` | String | _Optional_    | Cloudinary API secret                                         |

### 3.2 Frontend Services (`apps/storefront` & `apps/admin` — Vercel)

| Variable              | Type   | Default                 | Description                                    |
| --------------------- | ------ | ----------------------- | ---------------------------------------------- |
| `NODE_ENV`            | String | `development`           | Set to `production` in production environments |
| `PORT`                | Number | `3000`                  | HTTP port for Next.js server                   |
| `API_INTERNAL_URL`    | String | `http://127.0.0.1:3001` | Private internal API URL for SSR proxying      |
| `NEXT_PUBLIC_API_URL` | String | _Optional_              | Public API URL pointing to Render backend API  |

---

## 4. Database Migrations & Schema Deployment

### 4.1 Running Migrations

To execute pending Drizzle migrations:

```bash
# Build TypeScript artifacts and run Drizzle migrations
pnpm build
pnpm --filter @palnadu/persistence db:migrate
```

### 4.2 Verifying Migration Status

```bash
pnpm --filter @palnadu/persistence db:check
```

### 4.3 Safe Migration Rules

- All schema migrations must be strictly additive and backward-compatible with running API services.
- Never drop columns or tables in the same release as application code changes.
- Pre-deploy migrations run before new application containers take traffic.

---

## 5. Backup, Restore, and Disaster Recovery

### 5.1 Automated Snapshots

- Prisma Postgres and Render PostgreSQL provide daily automated backups with point-in-time recovery (PITR) retained for 7 days on standard plans.

### 5.2 Manual Database Backup

Before performing major deployments or administrative tasks, take an on-demand dump:

```bash
# Export custom-format PostgreSQL dump
pg_dump --format=custom --no-owner --no-acl --verbose "$DATABASE_DIRECT_URL" > palnadu_backup_$(date +%Y%m%d_%H%M%S).dump
```

### 5.3 Database Restore Procedure

In the event of database corruption or catastrophic failure:

```bash
# 1. Terminate active application traffic (enter maintenance mode)
# 2. Restore database from snapshot
pg_restore --clean --if-exists --no-owner --no-acl --verbose -d "$DATABASE_DIRECT_URL" palnadu_backup_YYYYMMDD_HHMMSS.dump
# 3. Verify database integrity
# 4. Resume application traffic
```

---

## 6. Health Probes, Monitoring, & Observability

### 6.1 Probes

- **Liveness Probe**: `GET /api/v1/health`
  - Responds with HTTP `200 OK` `{ "status": "ok" }`.
  - Verifies that the Fastify Node.js event loop is healthy and responding to requests.
- **Readiness Probe**: `GET /api/v1/health/ready`
  - Responds with HTTP `200 OK` `{ "status": "ok", "checks": { "database": "ok" } }`.
  - Executes `SELECT 1` on the database pool to confirm database connectivity.
  - If database is unreachable, returns HTTP `503 Service Unavailable`.

### 6.2 Monitoring & Alert Thresholds

- **5xx Error Rate**: Alert when 5xx errors exceed 1% over a 5-minute rolling window.
- **Latency**: Alert when P95 response time exceeds 800ms over a 10-minute period.
- **Memory Usage**: Alert when container memory utilization exceeds 85%.
- **Database Connection Utilization**: Alert when active pool connections exceed 80% of `DB_POOL_MAX`.

---

## 7. Zero-Downtime Deployment & Rollback Strategy

### 7.1 Deployment Sequence

1. **Pre-flight Checks**: Run all automated quality gates (`check:governance`, `lint`, `typecheck`, `test:unit`, `audit`).
2. **Database Migration**: Run `pnpm db:migrate` against the target database using `DATABASE_DIRECT_URL`.
3. **API Deployment**: Deploy `palnadu-api` on Render. Render health check verifies `/api/v1/health` and `/api/v1/ready` before routing traffic.
4. **Frontend Deployments**: Deploy `apps/storefront` and `apps/admin` on Vercel pointing to the deployed Render API endpoint.
5. **Post-Deployment Verification**: Execute staging smoke test protocol (`docs/deployment/SMOKE_TESTS.md`).

### 7.2 Immediate Rollback Procedure

If post-deployment smoke tests or health probes fail:

1. **Application Rollback**:
   - In Render Dashboard: Click **Rollback** on the failed service to immediately revert to the previous successful deploy commit.
   - Or via Git: Revert merge commit on `main`, push, and trigger build.
2. **Database Rollback**:
   - Since all migrations are strictly additive, the previous application version continues to function with the current schema.
   - If emergency data restoration is required, follow Section 5.3 using pre-deployment dump.
