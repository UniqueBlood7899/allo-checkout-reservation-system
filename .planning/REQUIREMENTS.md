# v1 Requirements — Allo Checkout Reservation System

## Data Layer

- [ ] **DATA-01**: Prisma schema defines `Product` model with id, name, description, price, SKU, createdAt
- [ ] **DATA-02**: Prisma schema defines `Warehouse` model with id, name, location, createdAt
- [ ] **DATA-03**: Prisma schema defines `Inventory` model joining Product + Warehouse with qty, reservedQty, updatedAt
- [ ] **DATA-04**: Prisma schema defines `Reservation` model with id, productId, warehouseId, qty, status (pending/confirmed/released), expiresAt, idempotencyKey, createdAt, updatedAt
- [ ] **DATA-05**: Database migration applied and Prisma client generated at `app/generated/prisma`
- [ ] **DATA-06**: Prisma singleton (`app/lib/prisma.ts`) prevents hot-reload connection exhaustion
- [ ] **DATA-07**: Seed data creates at least 3 products, 2 warehouses, and inventory rows for testing

## Concurrency & Locking

- [ ] **LOCK-01**: `POST /api/reservations` acquires row-level lock via `SELECT FOR UPDATE` on the inventory row inside a Prisma `$transaction`
- [ ] **LOCK-02**: Available quantity check (qty - reservedQty ≥ requested) occurs inside the same transaction as the increment
- [ ] **LOCK-03**: When two concurrent requests race for the last unit, exactly one receives 201 and the other receives 409
- [ ] **LOCK-04**: Transaction rollback correctly restores inventory state on any error
- [ ] **LOCK-05**: `POST /api/reservations/:id/confirm` atomically decrements `qty` and marks reservation `confirmed`
- [ ] **LOCK-06**: `POST /api/reservations/:id/release` atomically restores `reservedQty` and marks reservation `released`

## Idempotency

- [ ] **IDEM-01**: Upstash Redis client singleton (`app/lib/redis.ts`) configured via env vars
- [ ] **IDEM-02**: `POST /api/reservations` accepts `Idempotency-Key` header
- [ ] **IDEM-03**: Duplicate requests with same idempotency key return the cached response without creating a new reservation
- [ ] **IDEM-04**: Idempotency keys expire from Redis after 24 hours

## API Endpoints

- [ ] **API-01**: `GET /api/products` returns all products with per-warehouse available inventory (qty - reservedQty)
- [ ] **API-02**: `GET /api/warehouses` returns all warehouses with total available inventory
- [ ] **API-03**: `POST /api/reservations` validates request body with Zod (productId, warehouseId, qty required), returns 201 with reservation or 409 on conflict
- [ ] **API-04**: `POST /api/reservations/:id/confirm` confirms a pending reservation; returns 200 or 404/409/410 on invalid state
- [ ] **API-05**: `POST /api/reservations/:id/release` releases a pending or confirmed reservation; returns 200 or 404/410
- [ ] **API-06**: All API errors return structured JSON `{ error: string, code?: string }` with correct HTTP status
- [ ] **API-07**: 409 response body includes `{ error: "Insufficient stock", code: "OUT_OF_STOCK" }`
- [ ] **API-08**: 410 response body includes `{ error: "Reservation expired", code: "RESERVATION_EXPIRED" }`

## Expiry

- [ ] **EXP-01**: Reservations are created with `expiresAt = now() + 10 minutes`
- [ ] **EXP-02**: `POST /api/cron/release-expired` sweeps all `pending` reservations with `expiresAt < now()`, releases them, and restores inventory
- [ ] **EXP-03**: Vercel cron job configured in `vercel.json` to call `/api/cron/release-expired` every minute
- [ ] **EXP-04**: Cron endpoint is protected (secret header or Vercel's built-in CRON_SECRET)

## Frontend — Product Listing

- [ ] **UI-01**: `/` page displays product cards with name, price, and per-warehouse available stock
- [ ] **UI-02**: Products show stock status badge: `In Stock`, `Low Stock` (≤5), `Out of Stock`
- [ ] **UI-03**: Out-of-stock products show disabled "Reserve" button
- [ ] **UI-04**: Warehouse selector (if multiple warehouses have stock) allows choosing warehouse before checkout

## Frontend — Checkout / Reservation

- [ ] **UI-05**: Checkout page (`/checkout`) shows product summary, warehouse, quantity selector
- [ ] **UI-06**: Submitting checkout creates reservation via `POST /api/reservations` with optimistic UI (loading state during request)
- [ ] **UI-07**: On 409 conflict, UI displays clear "Item no longer available" message without navigating away
- [ ] **UI-08**: On successful reservation, redirect to `/checkout/[id]` reservation detail page
- [ ] **UI-09**: Reservation detail page shows countdown timer (10 minutes, ticking down in real-time)
- [ ] **UI-10**: Countdown timer reaches 0 → UI shows "Reservation expired" and disables confirm button
- [ ] **UI-11**: "Confirm Payment" button calls `POST /api/reservations/:id/confirm`; on 410 shows expired message
- [ ] **UI-12**: "Cancel" button calls `POST /api/reservations/:id/release`
- [ ] **UI-13**: On successful confirmation, show success state with reservation summary

## Error Handling (UI)

- [ ] **ERR-01**: Network errors (fetch fails) show user-friendly toast or inline error
- [ ] **ERR-02**: 409 "Out of Stock" is handled explicitly with distinct UI messaging
- [ ] **ERR-03**: 410 "Expired" is handled explicitly — confirm button becomes "Reservation Expired"

## v2 Requirements (Deferred)

- User authentication and session-scoped reservations
- Rate limiting on reservation endpoints
- Real-time inventory updates via Supabase Realtime subscriptions
- Email notifications on reservation confirmation/expiry
- Admin dashboard for reservation management

## Out of Scope

- Authentication / user accounts — not needed for MVP reservation engine
- Payment processing — external; system receives confirmation signal only
- Redis distributed locking for stock — architecture decision: PostgreSQL `FOR UPDATE` only
- Multi-warehouse automatic routing (split order across warehouses) — too complex for v1
- Multi-currency — single price field

## Traceability

| REQ-ID | Phase |
|--------|-------|
| DATA-01 to DATA-07 | Phase 1: Data Layer |
| LOCK-01 to LOCK-06 | Phase 2: Reservation API (Core) |
| IDEM-01 to IDEM-04 | Phase 2: Reservation API (Core) |
| API-01 to API-08 | Phase 2: Reservation API (Core) |
| EXP-01 to EXP-04 | Phase 3: Expiry & Cron |
| UI-01 to UI-04 | Phase 4: Product Listing UI |
| UI-05 to UI-13 | Phase 5: Checkout UI |
| ERR-01 to ERR-03 | Phase 5: Checkout UI |
