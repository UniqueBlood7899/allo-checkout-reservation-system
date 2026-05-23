---
phase: 03-expiry-sweeper
plan: 01
subsystem: Expiry Sweeper
tags: [cron, prisma, inventory, security]
dependency_graph:
  requires: [02-reservation-api]
  provides: [expiry-cleanup]
  affects: [Inventory, Reservation]
tech-stack:
  added: [vitest, dotenv]
  patterns: [per-row-transactions, bearer-token-auth]
key-files:
  - app/lib/sweeper.ts
  - app/api/cron/release-expired/route.ts
  - tests/sweeper.test.ts
decisions:
  - "Implemented per-row transactions to avoid blocking the entire sweep if one reservation fails."
  - "Used a simple Bearer token check against CRON_SECRET for endpoint security."
  - "Integrated Vitest for TDD of the sweeper service."
metrics:
  duration: "approx 45 mins"
  completed_date: "2026-05-24"
---

# Phase 03 Plan 01: Expiry Sweeper Implementation Summary

Implemented the core logic and API endpoint for automatically releasing expired pending reservations.

## Implementation Details

### Sweeper Service (`app/lib/sweeper.ts`)
- Implemented `releaseExpiredReservations` which finds all `pending` reservations with `expiresAt < now()`.
- For each eligible reservation, it executes a transaction that:
  1. Decrements `Inventory.reservedQty` by the reservation's quantity.
  2. Updates the reservation status to `released`.
- The service tracks `released` and `failed` counts, returning a summary object.
- Per-row transactions ensure that partial failures do not stop the overall process.

### Cron API Route (`app/api/cron/release-expired/route.ts`)
- Exposed a `GET` endpoint as required by Vercel Cron.
- Added a security guard that verifies the `Authorization: Bearer {CRON_SECRET}` header.
- Returns 401 for unauthorized access and 500 if `CRON_SECRET` is not configured.
- Returns a 200 OK response with the sweeper's summary JSON on success.

## TDD Evidence
- **Test Suite:** `tests/sweeper.test.ts`
- **Scenarios Verified:**
  - [x] Expired pending reservations are released and inventory restored.
  - [x] Non-expired pending reservations are ignored.
  - [x] Expired confirmed reservations are ignored.
  - [x] Empty result set handled correctly.
- **Result:** 2 tests passed.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
- `app/lib/sweeper.ts` exists.
- `app/api/cron/release-expired/route.ts` exists.
- `tests/sweeper.test.ts` exists and passes.
- Commits created for both tasks.
