---
mapped: 2026-05-23
focus: quality
status: scaffold (minimal conventions established by Next.js template)
---

# Coding Conventions

## TypeScript

- **Strict mode**: enabled (`"strict": true` in tsconfig)
- **No implicit any**: enforced by strict mode
- **Target**: ES2017
- **Module**: `esnext` with `bundler` resolution
- **Isolated modules**: `true` (required for Next.js SWC)

**Patterns to follow:**
```typescript
// API route handler pattern (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ ... })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  // ...
}

// Prisma singleton pattern (prevent hot-reload connection exhaustion)
// app/lib/prisma.ts
import { PrismaClient } from '@/app/generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## React / Next.js

- **Server Components by default**: Every `page.tsx` and `layout.tsx` is an RSC
- **Client components**: Marked with `'use client'` directive
- **Component naming**: PascalCase
- **File naming**: camelCase for utilities, PascalCase for components
- **Image optimization**: Use `next/image` (established in scaffold)
- **Font loading**: Use `next/font/google` (established in scaffold)

## Styling (Tailwind v4)

```css
/* Tailwind v4 — import via @import, NOT @tailwind directives */
@import "tailwindcss";

/* Theme customization via @theme inline block */
@theme inline {
  --color-background: var(--background);
}
```

**Key differences from Tailwind v3:**
- No `tailwind.config.js` (config lives in CSS via `@theme`)
- Use `@import "tailwindcss"` not `@tailwind base/components/utilities`
- CSS variables for theme tokens

## Error Handling

- API routes: return structured JSON errors with appropriate HTTP status codes
- Client components: use React Error Boundaries for UI errors
- Database errors: catch Prisma errors, map to HTTP responses

**Planned HTTP status code conventions:**
| Status | When |
|--------|------|
| 200 | Success (GET) |
| 201 | Created (POST reservation) |
| 400 | Validation error |
| 404 | Resource not found |
| 409 | Conflict (out of stock, concurrent reservation) |
| 410 | Gone (reservation expired) |
| 500 | Internal server error |

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ProductCard.tsx` |
| Utilities/lib | camelCase | `prisma.ts`, `redis.ts` |
| API routes | Next.js convention | `app/api/products/route.ts` |
| Env vars | SCREAMING_SNAKE_CASE | `DATABASE_URL` |
| Database models | PascalCase | `Product`, `Reservation` |
| DB columns | camelCase (Prisma maps to snake_case) | `createdAt` |
| Zod schemas | camelCase with `Schema` suffix | `createReservationSchema` |

## Import Order Convention

```typescript
// 1. Next.js imports
import { NextRequest, NextResponse } from 'next/server'

// 2. External packages
import { z } from 'zod'

// 3. Internal aliases (@/)
import { prisma } from '@/app/lib/prisma'
import type { Reservation } from '@/app/generated/prisma'
```

## Linting

- ESLint v9 flat config (`eslint.config.mjs`)
- Next.js core-web-vitals rules applied
- TypeScript rules applied via `eslint-config-next/typescript`
- Run: `npm run lint`
