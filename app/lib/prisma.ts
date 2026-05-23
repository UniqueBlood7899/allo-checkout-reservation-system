// Prisma v7 singleton pattern for Next.js using @prisma/adapter-pg.
// Prevents connection exhaustion during hot reload in development.
//
// CRITICAL: Import from '@/app/generated/prisma' NOT '@prisma/client' (Prisma v7)
// Prisma v7 requires a Driver Adapter — no more URL-only PrismaClient constructor.
// The app runtime uses DATABASE_URL (pooler, port 6543) — NOT DIRECT_URL.

import { PrismaClient } from '@/app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
