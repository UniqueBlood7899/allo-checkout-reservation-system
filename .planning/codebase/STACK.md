---
mapped: 2026-05-23
focus: tech
status: scaffold (no application code yet)
---

# Tech Stack

## Runtime & Language

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^5.x |
| Runtime | Node.js | 20.x (inferred from @types/node) |
| Framework | Next.js App Router | 16.2.6 |
| React | React | 19.2.4 |

## Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4.x | Utility-first CSS (v4 — PostCSS plugin) |
| `@tailwindcss/postcss` | ^4.x | PostCSS integration for Tailwind v4 |
| `clsx` | ^2.1.1 | Conditional class name utility |
| `tailwind-merge` | ^3.6.0 | Merge conflicting Tailwind classes |
| `lucide-react` | ^1.16.0 | Icon library |
| `react-hook-form` | ^7.76.1 | Form state management |
| `@hookform/resolvers` | ^5.4.0 | Zod integration with react-hook-form |
| `date-fns` | ^4.3.0 | Date formatting and manipulation |
| Fonts | Geist, Geist Mono | Google Fonts via next/font |

## Backend / API

| Library | Version | Purpose |
|---------|---------|---------|
| `next` (API routes) | 16.2.6 | Route Handlers in `app/api/` |
| `zod` | ^4.4.3 | Schema validation (request/response) |

## Database & ORM

| Technology | Version | Details |
|-----------|---------|---------|
| `@prisma/client` | ^7.8.0 | ORM client (generated to `app/generated/prisma`) |
| `prisma` | ^7.8.0 | Prisma CLI and migrations |
| PostgreSQL | via Supabase | Hosted at `aws-1-ap-south-1.pooler.supabase.com:6543` |
| `prisma.config.ts` | — | Custom Prisma config (uses `dotenv/config`) |

**Notes:**
- Prisma client outputs to `app/generated/prisma` (non-standard location)
- Using `prisma/config` API (Prisma v7 new config format)
- Migrations path: `prisma/migrations/`
- Schema: `prisma/schema.prisma` (currently empty — no models defined yet)

## Caching / Pub-Sub (Planned, not yet installed)

| Technology | Version | Purpose |
|-----------|---------|---------|
| `ioredis` | ^5.10.1 | Redis client (Upstash Redis, installed) |

**Note:** `ioredis` is installed but not configured/used yet. Upstash Redis is planned for idempotency keys.

## Validation

| Library | Version | Notes |
|---------|---------|-------|
| `zod` | ^4.4.3 | v4 API — `z.object`, `z.string`, etc. |

**Note:** Zod v4 has breaking changes from v3. Use `z.string().min(1)` not `.nonempty()`.

## Tooling

| Tool | Version | Config File |
|------|---------|-------------|
| ESLint | ^9.x | `eslint.config.mjs` |
| `eslint-config-next` | 16.2.6 | Next.js ESLint rules |
| PostCSS | — | `postcss.config.mjs` |
| TypeScript | ^5.x | `tsconfig.json` |

## Key Configuration Notes

- **Path alias**: `@/*` maps to project root (not `./src`)
- **Module resolution**: `bundler` mode
- **Target**: ES2017
- **Tailwind v4**: Uses CSS-native variables, no `tailwind.config.js` needed
- **Missing**: `shadcn/ui` not yet installed (planned in requirements)
- **Missing**: Upstash Redis client configuration not set up
- **Missing**: No `.env.example` — `.env` has real Supabase credentials checked in
