// Read-only service functions for products and warehouses.
// No locking needed — these are idempotent reads.
// availableQty = qty - reservedQty (D-01, D-03 from Phase 1 context)

import { prisma } from '@/app/lib/prisma'

export interface ProductWithInventory {
  id: string
  name: string
  description: string | null
  price: string // Decimal serializes as string
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

// GET /api/products — returns all products with per-warehouse available inventory (API-01)
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
      // availableQty = qty - reservedQty (D-01)
      availableQty: inv.qty - inv.reservedQty,
    })),
  }))
}

// GET /api/warehouses — returns all warehouses with total available inventory (API-02)
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
