# Phase 2 Discussion Log

**Date:** 2026-05-24
**Phase:** 02 — Reservation API
**Participants:** User + Agent

---

## Areas Discussed

### 1. Transaction Error Handling

**Q: When the reservation transaction fails, how should errors be classified?**
Selected: OutOfStockError → 409 OUT_OF_STOCK; serialization/lock contention errors → 409 RESERVATION_CONFLICT; unknown DB errors → 500

**Q: How should the service layer detect 'lock contention' — which error codes?**
Selected: Check Prisma error codes P2034 (serialization failure) and P2028 (transaction timeout) → RESERVATION_CONFLICT

**Q: On RESERVATION_CONFLICT, should the server retry or fail fast?**
Selected: No retry — fail fast, let the client retry if needed

---

### 2. Idempotency Key Flow

**Q: What does the Redis idempotency cache store?**
Selected: Full serialized JSON response body (status + body) — second call returns exact same 201 payload with no DB touch

**Q: What HTTP header carries the idempotency key?**
Selected: Idempotency-Key (Stripe-standard)

**Q: Is the header required or optional?**
Selected: Optional — clients without it get no deduplication

---

### 3. Reservation Expiry Check Placement

**Q: How should confirm/release detect an expired reservation?**
Selected: Both — check status first (must be 'pending'), then check expiresAt (belt-and-suspenders)

**Q: How should status mismatch map to HTTP codes?**
Selected: status != 'pending' → 409; expiresAt < now() AND status == 'pending' → 410

---

## Decisions Not Discussed (Pre-decided from Phase 1 or User Requirements)

| Decision | Source |
|---------|--------|
| SELECT FOR UPDATE — no Redis locking | User requirement + Phase 1 D-10 |
| Service layer in app/lib/ | Phase 1 D-10 |
| Typed error subclasses | Phase 1 D-12 |
| Shared Zod schemas in app/lib/schemas.ts | Phase 1 D-11 |
| Redis for idempotency only | User requirement |
| Explicit HTTP status handling | User requirement |
| Clean service-layer architecture | User requirement |

---

## Deferred Ideas

None surfaced during this discussion.
