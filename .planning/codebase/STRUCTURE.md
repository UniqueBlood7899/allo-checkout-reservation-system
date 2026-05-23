---
mapped: 2026-05-23
focus: arch
status: scaffold
---

# Directory Structure

## Current Layout

```
allo-reservation-system/
├── .agent/                         # GSD planning agent skills & workflows
│   ├── agents/                     # Subagent definitions
│   ├── get-shit-done/             # GSD core (workflows, templates, refs)
│   ├── hooks/                      # GSD lifecycle hooks
│   └── skills/                     # GSD slash command skills
├── .env                            # Environment variables (DB credentials)
├── .gitignore                      # Git ignore rules
├── .next/                          # Next.js build output (gitignored)
├── AGENTS.md                       # Project agent instructions (GSD + Next.js rules)
├── CLAUDE.md                       # Claude-specific notes
├── README.md                       # Basic project readme
├── app/                            # Next.js App Router root
│   ├── favicon.ico
│   ├── globals.css                 # Global CSS (Tailwind v4 directives)
│   ├── layout.tsx                  # Root layout (Geist fonts)
│   └── page.tsx                    # Root page (default Next.js scaffold)
├── eslint.config.mjs               # ESLint v9 flat config
├── next-env.d.ts                   # Next.js TypeScript declarations
├── next.config.ts                  # Next.js config (empty, TypeScript)
├── node_modules/                   # Dependencies (gitignored)
├── package.json                    # Dependencies & scripts
├── package-lock.json               # Lock file
├── postcss.config.mjs              # PostCSS config (Tailwind v4)
├── prisma/
│   └── schema.prisma               # Data models (currently empty)
├── prisma.config.ts                # Prisma v7 config (dotenv, schema path)
├── public/                         # Static assets
│   ├── next.svg
│   └── vercel.svg
└── tsconfig.json                   # TypeScript config
```

## Planned Structure (Post-Implementation)

```
app/
├── api/
│   ├── products/
│   │   └── route.ts                # GET /api/products
│   ├── warehouses/
│   │   └── route.ts                # GET /api/warehouses
│   ├── reservations/
│   │   ├── route.ts                # POST /api/reservations
│   │   └── [id]/
│   │       ├── confirm/route.ts    # POST /api/reservations/:id/confirm
│   │       └── release/route.ts    # POST /api/reservations/:id/release
│   └── cron/
│       └── release-expired/route.ts # POST /api/cron/release-expired
├── generated/
│   └── prisma/                     # Generated Prisma client
├── (pages)/
│   ├── page.tsx                    # Product listing
│   ├── checkout/
│   │   └── page.tsx                # Checkout / create reservation
│   └── checkout/[id]/
│       └── page.tsx                # Reservation detail + countdown
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ProductCard.tsx
│   ├── ReservationTimer.tsx
│   └── StockBadge.tsx
└── lib/
    ├── prisma.ts                   # Prisma client singleton
    ├── redis.ts                    # Upstash Redis client
    ├── reservations.ts             # Reservation business logic
    └── inventory.ts                # Inventory query helpers
```

## Naming Conventions (Inferred from scaffold)

- **Files**: `camelCase.ts` for utilities, `PascalCase.tsx` for components
- **Routes**: Next.js App Router file-system conventions (`route.ts`, `page.tsx`, `layout.tsx`)
- **Path alias**: `@/` maps to project root (e.g., `@/app/lib/prisma`)
- **Components**: PascalCase (React convention)
- **API files**: `route.ts` for Route Handlers

## Key Locations

| What | Where |
|------|-------|
| App entry | `app/layout.tsx` |
| Root page | `app/page.tsx` |
| Global styles | `app/globals.css` |
| Prisma schema | `prisma/schema.prisma` |
| Prisma config | `prisma.config.ts` |
| Env vars | `.env` |
| Type aliases | `tsconfig.json` `paths` |
