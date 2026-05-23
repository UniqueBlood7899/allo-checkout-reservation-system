---
mapped: 2026-05-23
focus: tech
status: scaffold (no integrations configured yet)
---

# External Integrations

## Database

### Supabase PostgreSQL

- **Type**: Managed PostgreSQL (Supabase)
- **Connection mode**: Pooler (`aws-1-ap-south-1.pooler.supabase.com:6543`) — for app use
- **Direct URL**: `db.jlsrpsxwoapeowpghvlh.supabase.co:5432` — for migrations
- **ORM**: Prisma v7 (`@prisma/client`)
- **Config**: `DATABASE_URL` (pooler) + `DIRECT_URL` (direct) in `.env`
- **Status**: Connected (credentials set), schema empty

**Prisma v7 specific notes:**
- `prismaClientSingleton` pattern needed to avoid hot-reload exhaustion in Next.js dev
- Use `$transaction` with `{ isolationLevel: 'Serializable' }` for reservation locking
- `SELECT FOR UPDATE` via Prisma raw queries for row-level locking

## Caching / Queue

### Upstash Redis (Planned)

- **Client**: `ioredis` ^5.10.1 (installed)
- **Status**: Installed but NOT configured (no `UPSTASH_REDIS_*` env vars present)
- **Planned use**: Idempotency keys for `POST /api/reservations`
- **Connection**: Will need `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

## Authentication

- **Status**: Not installed/planned for MVP
- No NextAuth, Supabase Auth, or Clerk configured

## Email / Notifications

- **Status**: Not planned for MVP

## Payment Processing

- **Status**: Not integrated (project is the pre-payment reservation layer)
- Reservation flow is payment-agnostic: confirms/releases based on external payment signal

## Deployment

### Vercel (Planned)

- **Cron jobs**: Planned for expiry release (via `vercel.json` `crons` config)
- **Status**: Not configured yet (no `vercel.json`)
- **Runtime**: Serverless Edge or Node.js runtime for API routes

## Monitoring / Observability

- **Status**: None configured

## Summary Table

| Integration | Package | Status | Purpose |
|------------|---------|--------|---------|
| Supabase PostgreSQL | `@prisma/client` v7 | ✅ Connected | Primary data store |
| Upstash Redis | `ioredis` | ⚠️ Installed, not configured | Idempotency keys |
| Vercel Cron | N/A | ❌ Not set up | Expiry sweeper |
| shadcn/ui | N/A | ❌ Not installed | Component library (planned) |
