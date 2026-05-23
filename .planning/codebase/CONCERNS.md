---
mapped: 2026-05-23
focus: concerns
severity: pre-implementation — concerns are architectural risks, not code bugs
---

# Concerns & Technical Debt

## 🔴 Critical — Must Address Before Launch

### 1. Credentials in `.env` Checked In
- **File**: `.env`
- **Issue**: Real Supabase PostgreSQL credentials (`DATABASE_URL`, `DIRECT_URL`) are present in `.env`. Although `.env*` is in `.gitignore`, the file exists and was likely visible during early repo setup.
- **Risk**: Credential exposure if `.gitignore` was ever misconfigured or file committed accidentally
- **Action**: Rotate Supabase credentials if this repo has ever been pushed. Use `.env.local` for local dev. Store secrets in Vercel environment variables for production.

### 2. Prisma Schema is Empty
- **File**: `prisma/schema.prisma`
- **Issue**: No models defined. The entire data layer (`Product`, `Warehouse`, `Inventory`, `Reservation`) must be designed and migrated before any API code works.
- **Risk**: Schema design mistakes are costly to migrate (especially for reservation state machine)
- **Action**: Design schema carefully with correct indices and constraints. Use `FOR UPDATE` friendly pattern (avoid composite PKs on the locked rows).

### 3. No Concurrency Testing Exists
- **Issue**: The core requirement (exactly-one-succeeds under concurrency) has zero test coverage
- **Risk**: Silent regression — locking logic may appear correct but fail under load
- **Action**: Write concurrent request tests before shipping reservation API

## 🟡 Medium — Address During Implementation

### 4. `shadcn/ui` Not Installed
- **Issue**: Required by spec but missing from `package.json` and project
- **Action**: Run `npx shadcn@latest init` during frontend setup phase

### 5. Upstash Redis Not Configured
- **Issue**: `ioredis` is installed but no `UPSTASH_REDIS_REST_URL` or connection config exists
- **Action**: Add Upstash credentials to `.env` and create `app/lib/redis.ts` singleton

### 6. No Prisma Client Singleton
- **Issue**: Prisma client output path is `app/generated/prisma` (non-standard). Without a singleton wrapper, Next.js dev mode will exhaust database connections.
- **Action**: Create `app/lib/prisma.ts` with `globalThis` singleton pattern

### 7. `DIRECT_URL` Not Configured in Prisma Schema
- **Issue**: Supabase with Prisma requires both `url` (pooler) and `directUrl` (direct connection for migrations). The `prisma.config.ts` only sets `datasource.url` — `directUrl` is missing.
- **Action**: Add `directUrl: process.env.DIRECT_URL` to `prisma.config.ts` datasource config

### 8. No `vercel.json` for Cron Jobs
- **Issue**: Expiry strategy requires a Vercel Cron job, but no `vercel.json` exists
- **Action**: Add `vercel.json` with cron configuration during deployment setup

### 9. Prisma v7 Generator Syntax
- **Issue**: `generator client { provider = "prisma-client" }` is the new Prisma v7 syntax. This differs from v5/v6's `provider = "prisma-client-js"`. The import path also changes to `@/app/generated/prisma` not `@prisma/client`.
- **Action**: Ensure all imports use `@/app/generated/prisma` and run `prisma generate` after schema changes.

## 🟢 Low — Track for Future

### 10. No Authentication Layer
- **Issue**: APIs are unauthenticated. Any client can confirm/release any reservation.
- **Action**: Scope to v2 — add user sessions or JWT tokens after MVP

### 11. No Rate Limiting
- **Issue**: `POST /api/reservations` can be spammed
- **Action**: Add Vercel's built-in rate limiting or upstash/ratelimit middleware (v2)

### 12. No Observability
- **Issue**: No logging, tracing, or error tracking (Sentry, DataDog, etc.)
- **Action**: Add structured logging to reservation service (v2)

### 13. Tailwind v4 is Pre-stable for Some Ecosystem Tools
- **Issue**: shadcn/ui may have limited Tailwind v4 support depending on version
- **Action**: Check shadcn compatibility with Tailwind v4 before installing; may need to pin shadcn version

## Summary

| # | Severity | Concern | Phase to Fix |
|---|---------|---------|-------------|
| 1 | 🔴 Critical | Credentials in .env | Immediately |
| 2 | 🔴 Critical | Empty Prisma schema | Phase 1 |
| 3 | 🔴 Critical | No concurrency tests | Phase 3 |
| 4 | 🟡 Medium | shadcn/ui not installed | Phase 2 |
| 5 | 🟡 Medium | Redis not configured | Phase 3 |
| 6 | 🟡 Medium | No Prisma singleton | Phase 1 |
| 7 | 🟡 Medium | directUrl missing | Phase 1 |
| 8 | 🟡 Medium | No vercel.json | Phase 4 |
| 9 | 🟡 Medium | Prisma v7 import path | Phase 1 |
| 10 | 🟢 Low | No auth | v2 |
| 11 | 🟢 Low | No rate limiting | v2 |
| 12 | 🟢 Low | No observability | v2 |
| 13 | 🟢 Low | shadcn/Tailwind v4 compat | Phase 2 |
