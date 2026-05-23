import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma v7: datasource.url is used by migrate/introspect commands.
  // Use DIRECT_URL (port 5432, direct Supabase connection) to bypass PgBouncer pooler,
  // which does not support DDL statements required for migrations.
  // The app runtime uses DATABASE_URL (pooler, port 6543) via PrismaClient constructor.
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
