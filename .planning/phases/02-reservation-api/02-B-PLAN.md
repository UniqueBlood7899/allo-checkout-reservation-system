# Plan 02-B: Read APIs — Products & Warehouses

**Phase:** 02 — Reservation API  
**Plan:** B — GET /api/products, GET /api/warehouses, service layer  
**Depends on:** Plan A (redis.ts must exist)  
**Status:** Ready to execute

---

## Goal

Implement:
1. `app/lib/products.ts` — service functions for product/warehouse queries with inventory join
2. `app/api/products/route.ts` — `GET /api/products`
3. `app/api/warehouses/route.ts` — `GET /api/warehouses`

---

## Context

- Phase 1 data: 3 products, 2 warehouses, 6 inventory rows in DB
- `availableQty = qty - reservedQty` (D-01, D-03 from Phase 1)
- Response shape: products with `inventory[]` per warehouse (D-17); warehouses with `totalAvailableQty` (D-18)
- These are read-only — no transaction or locking needed
- Requirements: API-01, API-02

---

## Tasks

### Task 1 — Create `app/lib/products.ts`

```typescript
// Read-only service functions for products and warehouses.
// No locking needed — these are idempotent reads.

import { prisma } from '@/app/lib/prisma'

export interface ProductWithInventory {
  id: string
  name: string
  description: string | null
  price: string  // Decimal serializes as string
  sku: string
  createdAt: Date
  inventory: Array<{
    warehouseId: string
    warehouseName: string
    availableQty: number
  }>
}

export interface WarehouseWithStock {
  id: string
  name: string
  location: string
  totalAvailableQty: number
}

// GET /api/products — returns all products with per-warehouse available inventory
export async function getAllProducts(): Promise<ProductWithInventory[]> {
  const products = await prisma.product.findMany({
    include: {
      inventory: {
        include: { warehouse: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    sku: product.sku,
    createdAt: product.createdAt,
    inventory: product.inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      availableQty: inv.qty - inv.reservedQty,
    })),
  }))
}

// GET /api/warehouses — returns all warehouses with total available inventory
export async function getAllWarehouses(): Promise<WarehouseWithStock[]> {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      inventory: true,
    },
    orderBy: { name: 'asc' },
  })

  return warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    location: warehouse.location,
    totalAvailableQty: warehouse.inventory.reduce(
      (sum, inv) => sum + (inv.qty - inv.reservedQty),
      0
    ),
  }))
}
```

### Task 2 — Create `app/api/products/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getAllProducts } from '@/app/lib/products'

export async function GET() {
  try {
    const products = await getAllProducts()
    return NextResponse.json(products)
  } catch (err) {
    console.error('[GET /api/products]', err)
    return NextResponse.json(
      { error: 'Failed to fetch products', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```

### Task 3 — Create `app/api/warehouses/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getAllWarehouses } from '@/app/lib/products'

export async function GET() {
  try {
    const warehouses = await getAllWarehouses()
    return NextResponse.json(warehouses)
  } catch (err) {
    console.error('[GET /api/warehouses]', err)
    return NextResponse.json(
      { error: 'Failed to fetch warehouses', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```

### Task 4 — Manual verification (dev server running)

```bash
# Both should return 200 with seeded data
curl http://localhost:3000/api/products | jq '.[0] | {name, inventory}'
curl http://localhost:3000/api/warehouses | jq '.[0]'
```

Expected: products array with `inventory[].availableQty`, warehouses with `totalAvailableQty`.

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/lib/products.ts app/api/products/route.ts app/api/warehouses/route.ts
git commit -m "feat(02-B): add products/warehouses service layer and GET API routes"
```

---

## Verification

- [ ] `GET /api/products` → 200 with product array, each has `inventory[].availableQty`
- [ ] `GET /api/warehouses` → 200 with warehouse array, each has `totalAvailableQty`
- [ ] `availableQty = qty - reservedQty` matches seeded data
- [ ] `npx tsc --noEmit` exits 0
- [ ] No raw SQL — these are pure ORM reads
