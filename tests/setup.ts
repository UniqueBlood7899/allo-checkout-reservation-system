import { beforeAll, afterAll } from 'vitest'
import { prisma } from '@/app/lib/prisma'

beforeAll(async () => {
  // Ensure we are connected to the DB
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (e) {
    console.error('Failed to connect to test database:', e)
    throw e
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
