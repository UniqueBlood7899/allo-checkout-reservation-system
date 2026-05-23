# ROADMAP — Allo Checkout Reservation System

## Milestone 1: Concurrency-Safe Reservation Engine v1

**Goal**: Build a production-ready inventory reservation system with PostgreSQL row-level locking, idempotency, expiry sweeper, and a functional checkout UI.

**Requirements coverage**: DATA-01–07, LOCK-01–06, IDEM-01–04, API-01–08, EXP-01–04, UI-01–13, ERR-01–03

---

### Phase 1: Data Layer — Prisma Schema, Migrations & Seed

**Goal:** Design and migrate the full database schema for Products, Warehouses, Inventory, and Reservations. Set up Prisma client singleton and seed realistic test data.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07

**Success Criteria:**
1. `prisma/schema.prisma` defines all 4 models with correct relations and constraints
2. `npx prisma migrate dev` runs successfully against Supabase PostgreSQL
3. `app/lib/prisma.ts` exports singleton Prisma client (no hot-reload connection exhaustion)
4. Seed script creates ≥3 products, ≥2 warehouses, inventory rows
5. `prisma studio` shows data correctly seeded

**Dependencies:** None

**Plans:**
- [ ] Plan A: Design Prisma schema (Product, Warehouse, Inventory, Reservation models)
- [ ] Plan B: Configure directUrl, run migration, generate client
- [ ] Plan C: Prisma singleton + seed script

---

### Phase 2: Reservation API — Concurrency, Idempotency & CRUD

**Goal:** Implement all REST API endpoints with row-level locking for concurrency safety, Redis idempotency keys, and correct 409/410 error responses.

**Requirements:** LOCK-01, LOCK-02, LOCK-03, LOCK-04, LOCK-05, LOCK-06, IDEM-01, IDEM-02, IDEM-03, IDEM-04, API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08

**Success Criteria:**
1. `POST /api/reservations` with concurrent requests for last unit → exactly one 201, others 409
2. Idempotency key header deduplicates identical requests (second call returns cached 201)
3. `POST /api/reservations/:id/confirm` decrements qty and marks confirmed atomically
4. `POST /api/reservations/:id/release` restores reservedQty and marks released
5. `GET /api/products` returns available inventory (qty - reservedQty) per warehouse
6. `GET /api/warehouses` returns warehouse list with aggregated inventory
7. All error responses are structured JSON with correct HTTP status codes

**Dependencies:** Phase 1

**Plans:**
- [ ] Plan A: Redis client singleton (`app/lib/redis.ts`) + idempotency middleware
- [ ] Plan B: `GET /api/products` and `GET /api/warehouses` endpoints
- [ ] Plan C: `POST /api/reservations` with SELECT FOR UPDATE transaction + idempotency check
- [ ] Plan D: `POST /api/reservations/:id/confirm` and `POST /api/reservations/:id/release`

---

### Phase 3: Expiry Sweeper — Vercel Cron & Reservation Cleanup

**Goal:** Implement the automatic expiry system — a protected cron endpoint that releases all expired pending reservations and a Vercel cron job that calls it every minute.

**Requirements:** EXP-01, EXP-02, EXP-03, EXP-04

**Success Criteria:**
1. `POST /api/cron/release-expired` atomically releases all `pending` reservations with `expiresAt < now()`
2. Released reservations have `reservedQty` correctly restored on their inventory rows
3. Endpoint rejects requests without valid `CRON_SECRET` header (returns 401)
4. `vercel.json` configures the cron job to run every minute
5. Confirmed reservations are NOT affected by the sweeper

**Dependencies:** Phase 2

**Plans:**
- [ ] Plan A: `POST /api/cron/release-expired` with batch transaction sweep
- [ ] Plan B: `vercel.json` cron config + `CRON_SECRET` environment variable setup

---

### Phase 4: Product Listing UI — Stock Visibility

**Goal:** Build the product listing page with per-warehouse stock display, stock status badges, and warehouse selector for checkout initiation.

**Requirements:** UI-01, UI-02, UI-03, UI-04

**Success Criteria:**
1. `/` page renders product cards with name, price, and per-warehouse available stock
2. Stock badge shows `In Stock`, `Low Stock` (≤5), or `Out of Stock` correctly
3. "Reserve" button is disabled for out-of-stock products
4. Warehouse dropdown appears when multiple warehouses have stock for a product
5. UI uses shadcn/ui components with Tailwind v4 styling

**Dependencies:** Phase 2 (needs GET /api/products and GET /api/warehouses)

**Plans:**
- [ ] Plan A: Install and configure shadcn/ui + core UI components
- [ ] Plan B: Product listing page (`app/page.tsx`) with stock display and warehouse selector

---

### Phase 5: Checkout UI — Reservation Flow, Countdown & Error Handling

**Goal:** Build the complete checkout experience — reservation creation form with optimistic UI, a real-time countdown timer, explicit 409/410 error states, confirm/cancel actions, and success state.

**Requirements:** UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13, ERR-01, ERR-02, ERR-03

**Success Criteria:**
1. Checkout page allows selecting qty and submitting to `POST /api/reservations` with loading state
2. 409 "Out of Stock" is caught and displayed inline without navigation
3. On success, redirects to `/checkout/[id]` reservation detail page
4. Countdown timer ticks down from 10:00 in real-time using `expiresAt` from API
5. When timer reaches 0, confirm button becomes disabled and shows "Reservation Expired"
6. "Confirm Payment" calls confirm API; 410 response is handled with expired message
7. "Cancel" calls release API and redirects back to product listing
8. Network/unexpected errors show user-friendly inline message

**Dependencies:** Phase 2, Phase 4

**Plans:**
- [ ] Plan A: Checkout page with reservation form and optimistic UI
- [ ] Plan B: Reservation detail page (`/checkout/[id]`) with countdown timer component
- [ ] Plan C: Error handling (409, 410, network errors) with explicit UI states
- [ ] Plan D: Confirm and release actions with success/expired state

---

## Backlog (Future Milestones)

- User authentication and session-scoped reservations
- Real-time inventory updates via Supabase Realtime
- Admin dashboard for reservation management
- Rate limiting on reservation endpoints
- Email notifications on reservation events
- Multi-warehouse order splitting
