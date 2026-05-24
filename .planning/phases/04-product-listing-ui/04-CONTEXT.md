# Phase 4: Product Listing UI — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the primary product listing page at `/` — a premium dark inventory operations dashboard.

**In scope:**
- `app/globals.css` — full dark design system (CSS variables, @theme, custom utilities)
- `app/page.tsx` — root page (product grid + metrics strip + navbar)
- `app/layout.tsx` — layout with dark base, font setup, Framer Motion provider
- `components/` — hand-crafted component library: ProductCard, WarehousePanel, MetricsStrip, Navbar, ReservationDrawer, CountdownTimer, StockPill
- `app/hooks/` — `useReservation.ts` (reservation flow state), `useProducts.ts` (data fetching)
- shadcn/ui install + dark theme override
- Framer Motion install

**Out of scope:** Checkout page `/checkout/[id]` (Phase 5), auth, payment processing.
</domain>

<decisions>
## Design System Decisions

### Color Palette (D-01)
```css
/* Tailwind v4 @theme block in app/globals.css */
@theme inline {
  --color-base: #0B1020;        /* matte charcoal page background */
  --color-surface: #111827;     /* card surfaces */
  --color-surface-raised: #1a2235; /* elevated card hover state */
  --color-border: rgba(99,102,241,0.15); /* indigo border glow at rest */
  --color-border-active: rgba(99,102,241,0.45); /* indigo glow on hover */
  --color-accent-indigo: #6366f1;
  --color-accent-cyan: #22d3ee;
  --color-stock-healthy: #10b981;  /* emerald */
  --color-stock-low: #f59e0b;      /* amber */
  --color-stock-empty: #ef4444;    /* red */
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8; /* muted slate, not gray */
  --color-text-muted: #475569;
}
```

### Typography (D-02)
- Primary: **Inter** (Google Fonts) — headings and body
- Monospace: **JetBrains Mono** — countdown timer digits only
- Heading hierarchy: `text-2xl font-bold` for product titles, `text-sm` for metadata
- Load via `next/font/google` in `app/layout.tsx`

### Layout Architecture (D-03)
```
Navbar (sticky top, glassmorphic)
  └── Logo + "Inventory Operations" label + live metrics badge
Metrics Strip (below navbar)
  └── Total products | Total warehouses | Items in stock | Active reservations
Product Grid (main content, 3-col desktop / 2-col tablet / 1-col mobile)
  └── ProductCard × N
Reservation Drawer (right panel desktop / bottom sheet mobile)
  └── Slide-in when Reserve clicked — stays on page, no navigation
```

### ProductCard Design (D-04)
Each card is a premium inventory control panel:
- **Glass surface**: `backdrop-blur-md bg-surface/80 border border-border`
- **Soft shadow depth**: `shadow-lg shadow-black/30`
- **Rounded**: `rounded-2xl`
- **Hover lift**: Framer Motion `whileHover={{ y: -4, scale: 1.01 }}` + border glow transition
- **Structure top→bottom**:
  1. Product avatar: lucide icon in indigo→cyan gradient circle (category-matched icon)
  2. Large bold product title + SKU muted
  3. Price tag badge (indigo pill)
  4. Stock summary pills (emerald/amber/red per warehouse)
  5. Warehouse distribution section: mini panels showing warehouse name + qty bar
  6. Reserve CTA button (bottom-right, indigo gradient)
- **Staggered entrance**: Framer Motion `variants` with stagger from parent

### Stock Status Indicators (D-05)
- `availableQty > 5` → emerald dot + "In Stock" pill
- `1 ≤ availableQty ≤ 5` → amber dot + "Low Stock" pill (pulsing dot)
- `availableQty === 0` → red dot + "Out of Stock" pill (Reserve button disabled)

### Reserve Button (D-06)
- **Default**: indigo gradient `bg-gradient-to-r from-indigo-600 to-indigo-500`, white text, `rounded-xl`
- **Hover**: glow `shadow-indigo-500/40 shadow-lg` + slight brightness
- **Loading**: spinner icon + "Locking inventory..." text
- **Disabled (no stock)**: muted opacity, cursor-not-allowed
- **Success flash**: brief emerald border glow on successful reservation

### Reservation Drawer (D-07)
- **Trigger**: clicking Reserve on a ProductCard (with warehouse pre-selected if only 1; show warehouse selector if multiple have stock)
- **Layout**: right panel on desktop (w-96), bottom sheet on mobile
- **Framer Motion**: `AnimatePresence` + slide from right/bottom
- **Content**:
  1. Product summary header (name, warehouse)
  2. Quantity selector (default 1, max = availableQty)
  3. Reserve button (same premium style as card)
  4. On success: transitions to CountdownTimer view in-drawer
  5. Confirm Payment and Cancel buttons appear after reservation created
- **Optimistic update**: immediately show "Reserved" state on card while API call in flight; revert on error

### CountdownTimer (D-08)
- **Font**: JetBrains Mono, large digits (`text-5xl font-bold tracking-tight`)
- **Animated progress bar**: shrinking width from 100% → 0% over 10 minutes, smooth CSS transition
- **Color states** (smooth Framer Motion color transitions):
  - `> 2 min`: cyan `#22d3ee`
  - `1–2 min`: amber `#f59e0b`
  - `< 30s`: red `#ef4444` + pulse animation on digits
- **Label**: "Inventory lock expires in" above digits
- **Expiry**: when hits 0 → show "Lock Expired" message, disable Confirm

### Animations (D-09)
All via Framer Motion:
- **Product grid**: staggered card entrance (delay 0.1s per card)
- **Card hover**: `whileHover={{ y: -4, scale: 1.005 }}` with `transition={{ type: "spring", stiffness: 300 }}`
- **Drawer**: `initial={{ x: '100%' }}` → `animate={{ x: 0 })` (desktop); `initial={{ y: '100%' }}` (mobile)
- **Countdown urgency**: color transition via Framer Motion `animate` on color property
- **Optimistic update**: scale pulse on Reserve click → card border flashes emerald
- **Loading spinner**: `animate={{ rotate: 360 }}` infinite

### shadcn/ui Setup (D-10)
- Install shadcn/ui using their CLI
- Components to add: `button`, `badge`, `drawer`, `dialog`, `select`
- Override all CSS variables in `globals.css` to match dark theme — do NOT use shadcn defaults
- shadcn components used only as structural primitives; visual styling fully overridden

### Data Fetching (D-11)
- `useProducts` hook: fetches `GET /api/products` on mount, polling every 30s for live stock updates (no WebSockets — polling is sufficient for Phase 4)
- `useReservation` hook: manages drawer state, calls `POST /api/reservations`, tracks active reservation state
- SWR or plain fetch + useState — use plain fetch (SWR not installed, avoid adding dep)

### Component File Structure (D-12)
```
components/
  ui/              ← shadcn primitives (auto-generated)
  Navbar.tsx
  MetricsStrip.tsx
  ProductCard.tsx
  WarehouseBar.tsx  ← mini inventory bar inside ProductCard
  StockPill.tsx
  ReservationDrawer.tsx
  CountdownTimer.tsx
  ProductAvatar.tsx  ← lucide icon in gradient circle
app/
  hooks/
    useProducts.ts
    useReservation.ts
```
</decisions>

<canonical_refs>
- `.planning/REQUIREMENTS.md` — UI-01 to UI-13
- `.planning/phases/02-reservation-api/02-CONTEXT.md` — API response shapes (availableQty, etc.)
- `app/api/products/route.ts` — GET /api/products shape
- `app/api/reservations/route.ts` — POST /api/reservations
- `app/api/reservations/[id]/confirm/route.ts` — POST /:id/confirm
- `app/api/reservations/[id]/release/route.ts` — POST /:id/release
- `GEMINI.md` — Tailwind v4 CSS-native config (`@import "tailwindcss"`, `@theme` block, no tailwind.config.js)
</canonical_refs>

<specifics>
## Exact Design Tokens

```
Background:  #0B1020 (page) / #111827 (card) / #1a2235 (raised)
Borders:     rgba(99,102,241,0.15) rest / rgba(99,102,241,0.45) hover
Accent:      #6366f1 indigo / #22d3ee cyan
Text:        #f8fafc primary / #94a3b8 secondary / #475569 muted
Stock:       #10b981 healthy / #f59e0b low / #ef4444 empty
```

## Framer Motion Install
```bash
npm install framer-motion
```

## shadcn/ui Install (check compatibility with Next.js 16 first)
```bash
npx shadcn@latest init
# Accept defaults, set CSS variables: yes, dark theme base
```

## Product Avatar Icons (category-matched)
- Headphones → `Headphones` (lucide)
- Shoes → `Footprints` (lucide)
- Backpack → `Backpack` (lucide)
- Fallback → `Package` (lucide)

## API Response Shape (from Phase 2)
```typescript
// GET /api/products
[{
  id: string, name: string, sku: string, price: string,
  inventory: [{ warehouseId, warehouseName, availableQty }]
}]

// POST /api/reservations → 201
{ id, productId, warehouseId, qty, status: 'pending', expiresAt }

// POST /:id/confirm → 200 / 410 / 409
// POST /:id/release → 200 / 410 / 409
```
</specifics>

<deferred>
## Deferred to Phase 5
- Checkout detail page `/checkout/[id]`
- Full reservation countdown on a dedicated page
- Payment confirmation flow
- Error UI-07 (409 conflict "Item no longer available") — handled in Phase 5 redirect flow
- UI-11, UI-12, UI-13 (confirm/cancel buttons on detail page)
</deferred>
