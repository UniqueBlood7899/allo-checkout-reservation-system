---
phase: 01-data-layer
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
autonomous: true
requirements:
  - DATA-01
  - DATA-02
  - DATA-03
  - DATA-04

must_haves:
  truths:
    - "prisma/schema.prisma defines all 4 models: Product, Warehouse, Inventory, Reservation"
    - "ReservationStatus is a PostgreSQL native enum with values pending, confirmed, released"
    - "Inventory has a unique composite constraint on (productId, warehouseId)"
    - "Reservation has a composite index on (status, expiresAt)"
    - "Inventory carries qty, reservedQty, updatedAt fields (no confirmedQty)"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "All 4 data models with correct relations and constraints"
      contains: "model Product"
    - path: "prisma/schema.prisma"
      contains: "model Warehouse"
    - path: "prisma/schema.prisma"
      contains: "model Inventory"
    - path: "prisma/schema.prisma"
      contains: "model Reservation"
    - path: "prisma/schema.prisma"
      contains: "enum ReservationStatus"
  key_links:
    - from: "prisma/schema.prisma Inventory"
      to: "prisma/schema.prisma Product"
      via: "productId foreign key relation"
      pattern: "productId.*String"
    - from: "prisma/schema.prisma Inventory"
      to: "prisma/schema.prisma Warehouse"
      via: "warehouseId foreign key relation"
      pattern: "warehouseId.*String"
    - from: "prisma/schema.prisma Reservation"
      to: "prisma/schema.prisma Inventory"
      via: "productId + warehouseId"
      pattern: "ReservationStatus"
---

<objective>
Design and write all 4 Prisma models with correct fields, relations, constraints, and indexes to support a concurrency-safe inventory reservation system.

Purpose: This schema is the foundation for all inventory locking logic. The models must enforce correctness at the database level (unique constraints, native enum types, non-negative check constraints) so that even application-level bugs cannot produce invalid state.

Output: A complete `prisma/schema.prisma` with Product, Warehouse, Inventory, Reservation models — ready for migration in Plan B.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
@.agent/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-data-layer/01-CONTEXT.md
@.planning/codebase/STACK.md
@GEMINI.md

<interfaces>
<!-- Current prisma/schema.prisma (empty scaffold): -->
<!--
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")    ← will be set by prisma.config.ts after Plan B
}
-->

<!-- Key decisions from CONTEXT.md:
  D-01: Denormalized reservedQty counter on Inventory. availableQty = qty - reservedQty
  D-02: Inventory fields: id, productId, warehouseId, qty, reservedQty, updatedAt
  D-03: Reserve: reservedQty+=qty | Release: reservedQty-=qty | Confirm: qty-=qty AND reservedQty-=qty
  D-04: ReservationStatus = PostgreSQL native enum {pending, confirmed, released}
  D-05: Inventory @@unique([productId, warehouseId]) + CHECK qty>=0 and reservedQty>=0
  D-06: Reservation @@index([status, expiresAt])
-->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write complete Prisma schema with all 4 models</name>
  <files>prisma/schema.prisma</files>
  <read_first>
    - prisma/schema.prisma (see current state in interfaces block above)
    - .planning/phases/01-data-layer/01-CONTEXT.md (D-01 through D-06 are locked decisions)
    - GEMINI.md (Prisma v7 generator syntax: provider = "prisma-client" NOT "prisma-client-js")
  </read_first>
  <action>
    Replace the contents of prisma/schema.prisma. Keep the existing generator block (provider = "prisma-client", output = "../app/generated/prisma") and datasource block unchanged — the datasource url will be wired via prisma.config.ts in Plan B, NOT inline here.

    Add the following models and enum:

    **enum ReservationStatus** (per D-04): values `pending`, `confirmed`, `released`.

    **model Product**: fields `id String @id @default(cuid())`, `name String`, `description String?`, `price Decimal @db.Decimal(10,2)`, `sku String @unique`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Relations: `inventory Inventory[]`, `reservations Reservation[]`.

    **model Warehouse**: fields `id String @id @default(cuid())`, `name String`, `location String`, `createdAt DateTime @default(now())`. Relations: `inventory Inventory[]`, `reservations Reservation[]`.

    **model Inventory** (per D-01, D-02, D-05): fields `id String @id @default(cuid())`, `productId String`, `warehouseId String`, `qty Int`, `reservedQty Int @default(0)`, `updatedAt DateTime @updatedAt`. Relations: `product Product @relation(fields: [productId], references: [id])`, `warehouse Warehouse @relation(fields: [warehouseId], references: [id])`. Constraints: `@@unique([productId, warehouseId])`. NOTE: The DB-level CHECK constraints (qty >= 0, reservedQty >= 0) CANNOT be expressed in Prisma SDL — add a comment `// CHECK constraints added via custom migration SQL in Plan B`.

    **model Reservation** (per D-04, D-06): fields `id String @id @default(cuid())`, `productId String`, `warehouseId String`, `qty Int`, `status ReservationStatus @default(pending)`, `idempotencyKey String? @unique`, `expiresAt DateTime`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Relations: `product Product @relation(fields: [productId], references: [id])`, `warehouse Warehouse @relation(fields: [warehouseId], references: [id])`. Index: `@@index([status, expiresAt])`.

    Do NOT add `url = env("DATABASE_URL")` to the datasource block — the url is provided by prisma.config.ts only.
  </action>
  <verify>
    <automated>cd /Users/suryaps/Documents/Hackathons/allohealth/allo-reservation-system && npx prisma validate 2>&1</automated>
  </verify>
  <done>
    `npx prisma validate` exits 0 with no errors. Schema contains all 4 models, the ReservationStatus enum, @@unique([productId, warehouseId]) on Inventory, and @@index([status, expiresAt]) on Reservation.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Schema → Database | Schema changes are applied via migration; malformed schema could cause data loss |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-A-01 | Tampering | prisma/schema.prisma | mitigate | Schema validated via `prisma validate` before migration; CHECK constraints enforce non-negative qty at DB level |
| T-01-A-02 | Information Disclosure | ReservationStatus enum | accept | Enum values are non-sensitive domain data |
</threat_model>

<verification>
Run `npx prisma validate` — exits 0 with no schema errors.
Grep schema for all 4 model names: `grep -E "^model (Product|Warehouse|Inventory|Reservation)" prisma/schema.prisma | wc -l` → outputs `4`.
Grep for enum: `grep "enum ReservationStatus" prisma/schema.prisma` → matches.
Grep for unique index: `grep "@@unique.*productId.*warehouseId\|@@unique.*warehouseId.*productId" prisma/schema.prisma` → matches.
Grep for reservation index: `grep "@@index.*status.*expiresAt\|@@index.*expiresAt.*status" prisma/schema.prisma` → matches.
</verification>

<success_criteria>
- `npx prisma validate` passes with no errors
- All 4 models defined with correct fields and types
- ReservationStatus native enum defined with pending/confirmed/released
- Inventory has @@unique([productId, warehouseId]) constraint
- Reservation has @@index([status, expiresAt]) for cron sweeper performance
- No API routes, no application code — schema only
</success_criteria>

<output>
Create `.planning/phases/01-data-layer/01-A-SUMMARY.md` when done.
</output>
