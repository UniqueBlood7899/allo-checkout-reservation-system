---
mapped: 2026-05-23
focus: arch
status: scaffold (no application code yet)
---

# Architecture

## Pattern

**Next.js App Router** — file-system based routing with React Server Components (RSC) by default. API routes use Route Handlers in `app/api/` directory.

**Current state:** Pure scaffold. No application architecture implemented yet.

## Planned Architecture Layers

```
┌────────────────────────────────────────┐
│          Next.js App Router             │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ React Pages  │  │ API Route        │ │
│  │ (RSC + CC)   │  │ Handlers         │ │
│  └──────┬───────┘  └────────┬─────────┘ │
│         │                   │           │
│  ┌──────▼───────────────────▼─────────┐ │
│  │          Service Layer              │ │
│  │   (reservation logic, inventory)    │ │
│  └──────┬───────────────────┬─────────┘ │
│         │                   │           │
│  ┌──────▼──────┐   ┌────────▼──────┐   │
│  │ Prisma ORM  │   │  Upstash Redis │   │
│  │ (Postgres)  │   │  (idempotency) │   │
│  └─────────────┘   └───────────────┘   │
└────────────────────────────────────────┘
```

## Key Architectural Decisions (from requirements)

### Concurrency Strategy: PostgreSQL Row-Level Locking
- `SELECT FOR UPDATE` inside Prisma `$transaction` blocks
- **NOT** Redis distributed locking for stock consistency
- Isolation level: `Serializable` or `ReadCommitted` with explicit `FOR UPDATE`
- Ensures exactly-one-succeeds semantics under concurrent reservations

### Reservation State Machine
```
pending ──(confirm)──► confirmed
pending ──(release / expire)──► released
confirmed ──(release)──► released
```

### Idempotency (Redis)
- Idempotency key stored in Redis with TTL
- Key: `idempotency:{key}` → response JSON
- Prevents duplicate reservation creation on network retry

### Expiry Strategy
- Vercel Cron job calls `POST /api/cron/release-expired`
- Sweeps reservations with `status=pending` and `expiresAt < now()`
- Atomically releases inventory and marks reservation `released`

## Data Flow

### Reservation Creation (`POST /api/reservations`)
```
Client → Route Handler → Check idempotency key (Redis)
                      → Begin Prisma transaction
                      → SELECT inventory FOR UPDATE (row lock)
                      → Check quantity ≥ requested
                      → Decrement reservedQty
                      → Create reservation record (status=pending, expiresAt=now+10min)
                      → Commit transaction
                      → Store idempotency key (Redis)
                      → Return 201 with reservation
```

### Concurrent Conflict
```
User A + User B both hit POST /api/reservations for last unit:
  → Both enter transaction
  → One acquires FOR UPDATE lock first
  → Other waits
  → First completes, commits (qty decremented to 0)
  → Second resumes, checks qty=0 → returns 409 Conflict
```

## Entry Points

| Entry | Path | Purpose |
|-------|------|---------|
| Root page | `app/page.tsx` | Product listing (to be implemented) |
| Root layout | `app/layout.tsx` | HTML shell, fonts |
| API routes | `app/api/` | REST endpoints (not created yet) |
| Prisma config | `prisma.config.ts` | Database connection |
| Schema | `prisma/schema.prisma` | Data models (empty) |

## Planned API Surface

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/products` | List products with inventory |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Create reservation (concurrency-safe) |
| POST | `/api/reservations/:id/confirm` | Confirm payment, decrement stock |
| POST | `/api/reservations/:id/release` | Manually release reservation |
| POST | `/api/cron/release-expired` | Cron: sweep expired pending reservations |

## Planned Page Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Products | Grid of products with warehouse stock |
| `/checkout` | Checkout | Create reservation, show countdown timer |
| `/checkout/[id]` | Reservation detail | Status, countdown, confirm/cancel actions |
