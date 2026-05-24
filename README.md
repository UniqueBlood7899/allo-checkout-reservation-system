# Allo Checkout Reservation System

A production-grade, concurrency-safe inventory reservation system built for e-commerce checkout flows.

## 🚀 Core Value Proposition

**Exactly one request wins under concurrent inventory contention.**

In high-traffic e-commerce events, "overselling" occurs when multiple users attempt to reserve the last unit of an item simultaneously. This system eliminates that risk by using **PostgreSQL row-level locking (`SELECT FOR UPDATE`)** to ensure that inventory checks and reservations are strictly serializable at the database level.

## 🛠️ Tech Stack

- **Framework:** Next.js 16.2.6 (App Router)
- **Database:** Supabase PostgreSQL
- **ORM:** Prisma v7 (with custom output path for Next.js compatibility)
- **Caching/Idempotency:** Upstash Redis (`ioredis`)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animations:** Framer Motion
- **Validation:** Zod v4
- **Deployment:** Vercel (with Vercel Cron for expiry sweeping)

## 🏗️ Architecture Decisions

### 1. PostgreSQL vs. Redis for Locking
While Redis is fast, it can be a single point of failure for stock correctness if not configured for extreme consistency. We chose **PostgreSQL row-level locking** for the following reasons:
- **ACID Guarantees:** Inventory correctness is managed within a single DB transaction.
- **No Distributed Lock Complexity:** Avoids the "split-brain" or "lock-leak" scenarios common in Redis-based locking.
- **Serializability:** `SELECT FOR UPDATE` ensures that if two users race for the last item, one will block until the other's transaction commits or fails.

### 2. Idempotency Layer
Redis is used **exclusively** for idempotency. We store a hash of the request keyed by the `Idempotency-Key` header. If a network retry occurs, the system replays the cached response without touching the database, preventing duplicate reservations.

### 3. Reservation Lifecycle
Reservations follow a strict state machine:
`pending` $\to$ `confirmed` (Payment Success) OR `released` (Payment Failure/Expiry).

### 4. The "Belt-and-Suspenders" Expiry
Expiry is handled in two layers to ensure no item is held indefinitely:
- **Active Layer:** The UI and API check `expiresAt` on every request.
- **Passive Layer:** A Vercel Cron job runs every minute, identifying and releasing all `pending` reservations that have passed their expiry time.

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project (PostgreSQL)
- An Upstash Redis instance

### Installation
1. **Clone and Install:**
   ```bash
   git clone <repo-url>
   cd allo-reservation-system
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-1-ap-south-south-1.pooler.supabase.com:6543/postgres"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@aws-1-ap-south-1.supabase.com:5432/postgres"

   # Redis
   REDIS_URL="redis://default:[PASSWORD]@your-redis-url.upstash.io:9443"

   # Cron Security
   CRON_SECRET="your-secure-random-string"
   ```

3. **Database Setup:**
   ```bash
   # Generate the Prisma client (v7 custom path)
   npx prisma generate

   # Apply migrations
   npx prisma migrate dev --name init

   # Seed the premium product catalog
   npx prisma db seed
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🔌 API Reference

| Endpoint | Method | Description | Key Header |
| :--- | :--- | :--- | :--- |
| `/api/products` | `GET` | List products with per-warehouse available stock | - |
| `/api/warehouses` | `GET` | List all active warehouses | - |
| `/api/reservations` | `POST` | Create a 10-min inventory lock | `Idempotency-Key` |
| `/api/reservations/[id]` | `GET` | Fetch reservation details for checkout | - |
| `/api/reservations/[id]/confirm` | `POST` | Convert reservation to a permanent sale | - |
| `/api/reservations/[id]/release` | `POST` | Manually release the inventory lock | - |
| `/api/cron/release-expired` | `GET` | Cron endpoint to sweep expired locks | `Authorization: Bearer {CRON_SECRET}` |

## 🧪 Testing & Verification

### Concurrency Test
To verify the "exactly one winner" guarantee, run the idempotency and concurrency suite:
```bash
npm run test
```
The tests simulate parallel requests for the last available unit of a product across different warehouses to ensure zero overselling.

### Manual Verification
1. Open the app at `http://localhost:3000`.
2. Find a product with `qty=1` (e.g., Nova ANC Headphones in NYC).
3. Reserve it.
4. In a second tab, attempt to reserve the same product/warehouse. It should return a `409 Conflict`.
5. Wait 10 minutes or manually call `/api/reservations/[id]/release`.
6. Verify the item is available again in the product grid.
