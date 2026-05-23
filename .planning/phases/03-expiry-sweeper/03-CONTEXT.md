# Phase 3: Expiry Sweeper — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the automatic expiry cleanup system:
- `POST /api/cron/release-expired` — protected cron endpoint that sweeps all expired pending reservations
- `vercel.json` — Vercel cron job configuration (every minute)
- `app/lib/sweeper.ts` — batch release service function

**In scope:** Cron endpoint, Vercel schedule config, batch per-row release logic, auth guard.

**Out of scope:** Frontend UI (Phases 4–5), per-reservation expiry check on confirm/release (already in Phase 2), Redis (not involved in expiry sweeper).
</domain>

<decisions>
## Implementation Decisions

### Batch Release Strategy
- **D-01:** Per-row transactions — fetch all expired `pending` reservations, then loop through each and release it in its own `prisma.$transaction`. Each row is independent; partial success is acceptable.
- **D-02:** Never abort the loop on failure — if one row's transaction throws, log the error + reservation ID, add to `errors[]`, and continue to the next row.
- **D-03:** Response shape (always 200):
  ```json
  { "released": 3, "failed": 0, "errors": [] }
  ```
  `errors[]` contains `{ id: string, error: string }` entries for any failed rows.
- **D-04:** Each per-row transaction does: `reservedQty -= reservation.qty` on the Inventory row + `status = 'released'` on the Reservation — same pattern as `releaseReservation()` in Phase 2 (`app/lib/reservations.ts`), but extracted/reused for batch context.
- **D-05:** Only `pending` reservations with `expiresAt < now()` are swept. `confirmed` and already-`released` reservations are never touched (Success Criteria 5).

### Cron Secret Protection
- **D-06:** Vercel built-in `CRON_SECRET` pattern: read `Authorization` header (Vercel automatically injects `Bearer {CRON_SECRET}` on cron invocations), compare against `process.env.CRON_SECRET`.
- **D-07:** Validation: extract Bearer token from `Authorization: Bearer {token}`, compare with `timingSafeEqual` (or simple string equality) against `CRON_SECRET`.
- **D-08:** 401 for BOTH missing `Authorization` header AND wrong secret value — do not distinguish between missing vs wrong (avoid information leakage).
- **D-09:** Error response: `{ error: 'Unauthorized' }` — no additional detail.
- **D-10:** If `CRON_SECRET` env var is not set at all → throw at startup / return 500 with logged warning.

### Vercel Cron Configuration
- **D-11:** `vercel.json` at project root:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/release-expired",
        "schedule": "* * * * *"
      }
    ]
  }
  ```
  Schedule `"* * * * *"` = every minute (EXP-03).
- **D-12:** The cron job is invoked via GET by Vercel cron, but the route handler responds to POST (or GET — verify Vercel docs). Use GET for Vercel cron compatibility (Vercel cron sends GET requests to the configured path).

### Service Layer
- **D-13:** New service file `app/lib/sweeper.ts` — `releaseExpiredReservations()` function. Keeps cron logic separate from the individual reservation lifecycle in `reservations.ts`.
- **D-14:** Fetch query: `prisma.reservation.findMany({ where: { status: 'pending', expiresAt: { lt: new Date() } } })` — no `FOR UPDATE` needed here (cron is the only writer for expired rows; per-row transactions prevent double-release).
- **D-15:** RESTful route at `app/api/cron/release-expired/route.ts` (Next.js App Router convention).

### API Behavior
- **D-16:** HTTP method: `GET` (Vercel cron invokes via GET by default). Route handler exports `GET`.
- **D-17:** Successful sweep → 200 with summary JSON (D-03).
- **D-18:** Auth failure → 401 `{ error: 'Unauthorized' }`.
- **D-19:** Unexpected sweeper error → 500, logged to console.
- **D-20:** Zod validation: no request body needed — auth is in headers only.

### Error Handling
- **D-21:** Per-row failure: catch block appends `{ id: reservation.id, error: String(err) }` to `errors[]`, increments `failed` counter, continues loop.
- **D-22:** Final 200 response always returns `{ released, failed, errors }` regardless of partial failures — lets Vercel/monitoring see the result without false-alarm retries.
</decisions>

<canonical_refs>
- `.planning/REQUIREMENTS.md` — EXP-01 to EXP-04
- `.planning/phases/02-reservation-api/02-CONTEXT.md` — Phase 2 decisions (service layer patterns)
- `app/lib/reservations.ts` — `releaseReservation()` pattern to reuse for per-row logic
- `app/lib/prisma.ts` — Prisma singleton
- `app/lib/errors.ts` — error classes (not needed in sweeper — it logs, not throws to HTTP)
- `GEMINI.md` — Next.js 16+ route handler patterns
</canonical_refs>

<code_context>
## Reusable Assets from Phase 2

| Asset | File | Notes |
|-------|------|-------|
| `prisma` singleton | `app/lib/prisma.ts` | Used for DB queries |
| `releaseReservation()` | `app/lib/reservations.ts` | Per-row release pattern — reuse transaction logic |
| Route handler pattern | `app/api/reservations/route.ts` | `NextRequest`/`NextResponse`, try/catch structure |

## Key Pattern — Per-Row Release in Sweeper

```typescript
// app/lib/sweeper.ts
export async function releaseExpiredReservations() {
  const expired = await prisma.reservation.findMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } },
  })

  let released = 0
  let failed = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventory.updateMany({
          where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
          data: { reservedQty: { decrement: reservation.qty } },
        })
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'released' },
        })
      })
      released++
    } catch (err) {
      failed++
      errors.push({ id: reservation.id, error: String(err) })
      console.error(`[sweeper] Failed to release reservation ${reservation.id}:`, err)
    }
  }

  return { released, failed, errors }
}
```

## Key Pattern — Vercel CRON_SECRET Auth

```typescript
// app/api/cron/release-expired/route.ts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... proceed with sweep
}
```
</code_context>

<user_preferences>
- RESTful App Router endpoints (GET for cron, clean route structure)
- Zod validation (no body to validate here — auth in headers)
- Explicit HTTP status codes (200 success, 401 auth failure, 500 unexpected)
- Proper error handling (per-row try/catch, never abort loop)
- Clean separation of services (sweeper logic in app/lib/sweeper.ts, not in route handler)
</user_preferences>
