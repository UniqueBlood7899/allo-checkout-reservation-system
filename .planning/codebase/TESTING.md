---
mapped: 2026-05-23
focus: quality
status: no tests exist yet
---

# Testing

## Current State

**No tests exist.** The scaffold has no test framework installed.

## Recommended Testing Setup

### Unit / Integration Tests

| Tool | Recommendation | Rationale |
|------|---------------|-----------|
| **Jest** or **Vitest** | Vitest preferred | Faster, ESM-native, Vite-compatible config |
| `@testing-library/react` | For UI components | Industry standard for RSC testing |
| `msw` (Mock Service Worker) | For API mocking | Better than fetch mocks |

### Critical Test Cases (by priority)

#### 1. Concurrency / Inventory Locking (HIGHEST PRIORITY)
```
- POST /api/reservations with concurrent requests for last unit
  → Exactly one should succeed (201), others get 409
- SELECT FOR UPDATE prevents double-booking
- Transaction rollback on failure releases lock
```

#### 2. Reservation State Machine
```
- pending → confirmed (valid)
- pending → released (valid)
- confirmed → released (valid)
- confirmed → confirmed (idempotent or error)
- released → confirmed (invalid, 409/410)
```

#### 3. Expiry Sweeper (Cron)
```
- POST /api/cron/release-expired
  → Releases all pending reservations with expiresAt < now()
  → Returns inventory qty correctly
  → Does NOT release confirmed reservations
```

#### 4. Idempotency (Redis)
```
- POST /api/reservations with same idempotency key twice
  → Returns same response both times (cached)
  → Does NOT create duplicate reservation
```

#### 5. API Validation
```
- POST /api/reservations with missing fields → 400
- POST /api/reservations with negative qty → 400
- POST /api/reservations/:id/confirm with unknown id → 404
```

## Test Strategy Recommendations

- **Database tests**: Use a test Supabase project or Docker PostgreSQL
- **Redis tests**: Use Upstash test instance or `ioredis-mock`
- **Concurrency tests**: Use `Promise.all` with N concurrent requests to validate locking
- **Mock Prisma**: Use `jest-mock-extended` or `@prisma/client/testing`

## CI/CD

- No CI pipeline configured yet
- Recommend GitHub Actions with `pnpm test` on PR
- Separate job for DB integration tests (needs test database)

## Test File Conventions (Recommended)

```
__tests__/
  api/
    reservations.test.ts         # API route tests
    products.test.ts
  lib/
    inventory.test.ts            # Business logic tests
    reservations.test.ts
  e2e/                           # Playwright or Cypress (future)
```
