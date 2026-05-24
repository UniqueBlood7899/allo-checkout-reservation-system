# Phase 3 Validation: Expiry Sweeper

This document maps the Success Criteria from ROADMAP.md to specific, testable verification steps for the Expiry Sweeper phase.

## Success Criteria Mapping

| Roadmap Criterion | Verification Step | Expected Outcome |
|------------------|-------------------|------------------|
| 1. `GET /api/cron/release-expired` releases all `pending` reservations with `expiresAt < now()` | 1. Create 3 pending reservations with `expiresAt` in the past.<br>2. Call `GET /api/cron/release-expired` with valid secret. | API returns `released: 3`. Database shows all 3 reservations have `status = 'released'`. |
| 2. Released reservations have `reservedQty` correctly restored | 1. Note `Inventory.reservedQty` for a product.<br>2. Create pending reservation (increases `reservedQty`).<br>3. Set `expiresAt` to past.<br>4. Trigger sweeper. | `Inventory.reservedQty` returns to the value noted in step 1. |
| 3. Endpoint rejects requests without valid `CRON_SECRET` | 1. Call `GET /api/cron/release-expired` without `Authorization` header.<br>2. Call with incorrect secret. | Both requests return `401 Unauthorized`. |
| 4. `vercel.json` configures the cron job to run every minute | Inspect `vercel.json` for `cron` array. | `cron` array contains a job targeting `/api/cron/release-expired` with `schedule: "0 * * * *"` (or every minute equivalent). |
| 5. Confirmed reservations are NOT affected | 1. Create a confirmed reservation with `expiresAt` in the past.<br>2. Trigger sweeper. | Reservation remains `status = 'confirmed'`. API summary does not count it as released. |
| 6. `CRON_SECRET` existence guard (D-10) | 1. Temporarily unset `CRON_SECRET` in environment.<br>2. Call `GET /api/cron/release-expired`. | API returns `500 Internal Server Error` and logs "CRON_SECRET is not defined". |

## Automated Test Suite

The following tests must pass:
- `npm test -- --filter=sweeper` (Unit/Integration tests for `releaseExpiredReservations` logic)
- Integration tests for `/api/cron/release-expired` route (Auth, Guard, and Execution)
