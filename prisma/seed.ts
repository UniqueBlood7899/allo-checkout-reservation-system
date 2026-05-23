// Idempotent database seed script.
// Run via: npx prisma db seed
//
// Uses stable hardcoded IDs so upserts are deterministic — safe to run multiple times.
// Seed data designed to cover all key inventory test scenarios (D-07, D-08).

import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Check your .env file.')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

async function main() {
  const prisma = createClient()

  try {
    // ─── Warehouses ────────────────────────────────────────────────
    const eastWarehouse = await prisma.warehouse.upsert({
      where: { id: 'wh-east' },
      update: { name: 'East Warehouse', location: 'New York, NY' },
      create: { id: 'wh-east', name: 'East Warehouse', location: 'New York, NY' },
    })

    const westWarehouse = await prisma.warehouse.upsert({
      where: { id: 'wh-west' },
      update: { name: 'West Warehouse', location: 'Los Angeles, CA' },
      create: { id: 'wh-west', name: 'West Warehouse', location: 'Los Angeles, CA' },
    })

    // ─── Products ───────────────────────────────────────────────────
    const headphones = await prisma.product.upsert({
      where: { id: 'prod-headphones' },
      update: {
        name: 'Wireless Noise-Cancelling Headphones',
        sku: 'WH-NC-001',
        price: 79.99,
        description: 'Premium wireless headphones with 30hr battery life',
      },
      create: {
        id: 'prod-headphones',
        name: 'Wireless Noise-Cancelling Headphones',
        sku: 'WH-NC-001',
        price: 79.99,
        description: 'Premium wireless headphones with 30hr battery life',
      },
    })

    const shoes = await prisma.product.upsert({
      where: { id: 'prod-shoes' },
      update: {
        name: 'Trail Running Shoes',
        sku: 'TR-SHOE-002',
        price: 124.99,
        description: 'Lightweight trail running shoes with grip sole',
      },
      create: {
        id: 'prod-shoes',
        name: 'Trail Running Shoes',
        sku: 'TR-SHOE-002',
        price: 124.99,
        description: 'Lightweight trail running shoes with grip sole',
      },
    })

    const backpack = await prisma.product.upsert({
      where: { id: 'prod-backpack' },
      update: {
        name: 'Laptop Backpack 30L',
        sku: 'LB-30L-003',
        price: 59.99,
        description: 'Water-resistant 30L laptop backpack with USB charging port',
      },
      create: {
        id: 'prod-backpack',
        name: 'Laptop Backpack 30L',
        sku: 'LB-30L-003',
        price: 59.99,
        description: 'Water-resistant 30L laptop backpack with USB charging port',
      },
    })

    // ─── Inventory ──────────────────────────────────────────────────
    // D-08: Mixed quantities to test all key UI scenarios:
    //   qty=1  → THE concurrency race condition test (last unit)
    //   qty=5  → Low Stock badge test (threshold ≤5)
    //   qty=50 → Normal "In Stock" state

    // Headphones: East=1 (RACE CONDITION TEST), West=20
    await prisma.inventory.upsert({
      where: { id: 'inv-headphones-east' },
      update: { qty: 1, reservedQty: 0 },
      create: {
        id: 'inv-headphones-east',
        productId: headphones.id,
        warehouseId: eastWarehouse.id,
        qty: 1,
        reservedQty: 0,
      },
    })

    await prisma.inventory.upsert({
      where: { id: 'inv-headphones-west' },
      update: { qty: 20, reservedQty: 0 },
      create: {
        id: 'inv-headphones-west',
        productId: headphones.id,
        warehouseId: westWarehouse.id,
        qty: 20,
        reservedQty: 0,
      },
    })

    // Shoes: East=5 (LOW STOCK badge test), West=15
    await prisma.inventory.upsert({
      where: { id: 'inv-shoes-east' },
      update: { qty: 5, reservedQty: 0 },
      create: {
        id: 'inv-shoes-east',
        productId: shoes.id,
        warehouseId: eastWarehouse.id,
        qty: 5,
        reservedQty: 0,
      },
    })

    await prisma.inventory.upsert({
      where: { id: 'inv-shoes-west' },
      update: { qty: 15, reservedQty: 0 },
      create: {
        id: 'inv-shoes-west',
        productId: shoes.id,
        warehouseId: westWarehouse.id,
        qty: 15,
        reservedQty: 0,
      },
    })

    // Backpack: East=50 (NORMAL in-stock), West=30
    await prisma.inventory.upsert({
      where: { id: 'inv-backpack-east' },
      update: { qty: 50, reservedQty: 0 },
      create: {
        id: 'inv-backpack-east',
        productId: backpack.id,
        warehouseId: eastWarehouse.id,
        qty: 50,
        reservedQty: 0,
      },
    })

    await prisma.inventory.upsert({
      where: { id: 'inv-backpack-west' },
      update: { qty: 30, reservedQty: 0 },
      create: {
        id: 'inv-backpack-west',
        productId: backpack.id,
        warehouseId: westWarehouse.id,
        qty: 30,
        reservedQty: 0,
      },
    })

    console.log('✅ Seed complete: 2 warehouses, 3 products, 6 inventory rows')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
