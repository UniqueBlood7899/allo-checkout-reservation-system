<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Allo Checkout Reservation System — Agent Instructions

## Project Overview

Concurrency-safe inventory reservation system for ecommerce checkout. Built on Next.js 16.2.6 App Router with Supabase PostgreSQL and Upstash Redis.

**GSD Workflow active** — See `.planning/` for requirements, roadmap, and phase plans.

## Critical Rules (Read First)

### 1. Prisma v7 — Non-Standard Import Path & Adapter Constructor

The Prisma client is generated to `app/generated/prisma`, NOT `@prisma/client`.
The entry point is `client.ts` (no `index.ts`) — always import from the `client` subpath.
Prisma v7 requires `@prisma/adapter-pg` — no URL-only `PrismaClient` constructor.

```typescript
// ✅ CORRECT
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ❌ WRONG — will fail
import { PrismaClient } from '@prisma/client'
import { PrismaClient } from '@/app/generated/prisma'  // no index.ts, fails resolution
new PrismaClient()  // missing adapter — Prisma v7 requires it
```

Seed config is in `prisma.config.ts migrations.seed`, NOT `package.json prisma.seed`.
Migration URL must be `DIRECT_URL` (port 5432) in `prisma.config.ts datasource.url`.
`url`/`directUrl` in `schema.prisma` datasource block are **removed** in Prisma v7.

Always run `npx prisma generate` after schema changes.

### 2. Concurrency — PostgreSQL FOR UPDATE Only

**NEVER use Redis for inventory locking.** All stock correctness must use `SELECT FOR UPDATE` inside Prisma transactions.

```typescript
// ✅ CORRECT — row-level locking
await prisma.$transaction(async (tx) => {
  const inv = await tx.$queryRaw`
    SELECT * FROM "Inventory"
    WHERE id = ${inventoryId}
    FOR UPDATE
  `
  // check and update qty here
})

// ❌ WRONG — Redis locking is explicitly excluded
await redis.set(`lock:${inventoryId}`, '1', 'NX', 'EX', 30)
```

Redis is used ONLY for idempotency keys on `POST /api/reservations`.

### 3. Tailwind v4 — CSS-Native Config

```css
/* ✅ CORRECT — Tailwind v4 */
@import "tailwindcss";

/* ❌ WRONG — Tailwind v3 syntax */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

No `tailwind.config.js` — theme is configured via `@theme` block in CSS.

### 4. Zod v4 — Breaking Changes

```typescript
// ✅ Zod v4
z.string().min(1)         // use .min(1) not .nonempty()
z.object({ ... })         // same
z.infer<typeof schema>    // same

// ❌ Zod v4 removed
z.string().nonempty()     // removed in v4
```

### 5. Next.js App Router — Route Handler Pattern

```typescript
// app/api/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // ...
  return NextResponse.json(data, { status: 201 })
}

// Dynamic segments: app/api/reservations/[id]/confirm/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // params is a Promise in Next.js 16+
}
```

## Planning Files

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Project context, requirements, decisions |
| `.planning/REQUIREMENTS.md` | All v1 requirements with REQ-IDs |
| `.planning/ROADMAP.md` | 5-phase execution plan |
| `.planning/STATE.md` | Current progress |
| `.planning/codebase/` | Codebase map (STACK, ARCH, etc.) |

## GSD Workflow Commands

- `/gsd-discuss-phase 1` — start Phase 1 discussion
- `/gsd-plan-phase 1` — plan Phase 1 directly
- `/gsd-progress` — check current status

## Environment Variables Needed

```bash
# In .env (pooler for app, direct for migrations)
DATABASE_URL=postgresql://...  # Supabase pooler
DIRECT_URL=postgresql://...    # Supabase direct

# Add these:
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
CRON_SECRET=...  # For protecting /api/cron/release-expired
```

## API Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| 409 | `OUT_OF_STOCK` | Insufficient inventory |
| 409 | `RESERVATION_CONFLICT` | Concurrent lock contention |
| 410 | `RESERVATION_EXPIRED` | Reservation past expiresAt |
| 404 | `NOT_FOUND` | Resource doesn't exist |
