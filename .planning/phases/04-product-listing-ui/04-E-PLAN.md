# Plan 04-E: Page Assembly & Polish

**Phase:** 04 — Product Listing UI
**Plan:** E — Final assembly, app/page.tsx, polish
**Depends on:** Plans A–D (all components built)
**Status:** Ready to execute

---

## Goal

Wire everything together:
1. `app/page.tsx` — root page: Navbar + MetricsStrip + ProductGrid + ReservationDrawer
2. Mobile responsive adjustments to drawer (bottom sheet on mobile)
3. End-to-end UI smoke test against running dev server
4. Fix any type errors or rendering issues

---

## Tasks

### Task 1 — Rewrite `app/page.tsx`

```tsx
'use client'

import { useCallback } from 'react'
import { Navbar } from '@/components/Navbar'
import { MetricsStrip } from '@/components/MetricsStrip'
import { ProductGrid } from '@/components/ProductGrid'
import { ReservationDrawer } from '@/components/ReservationDrawer'
import { useProducts } from '@/app/hooks/useProducts'
import { useReservation } from '@/app/hooks/useReservation'
import type { Product } from '@/app/hooks/useProducts'

export default function HomePage() {
  const { products, loading, error, refresh } = useProducts()
  const { state, openDrawer, closeDrawer, setWarehouse, setQty, reserve, confirm, release } =
    useReservation(refresh) // refresh product list on successful reservation/confirm/release

  const handleReserve = useCallback(
    (product: Product, warehouseId: string) => {
      openDrawer(product, warehouseId)
    },
    [openDrawer]
  )

  const handleExpired = useCallback(() => {
    // Reservation expired mid-drawer — refresh stock and stay on error state
    refresh()
  }, [refresh])

  // Compute metrics
  const totalAvailable = products.reduce(
    (sum, p) => sum + p.inventory.reduce((s, i) => s + i.availableQty, 0),
    0
  )
  const totalWarehouses = products.length > 0
    ? new Set(products.flatMap((p) => p.inventory.map((i) => i.warehouseId))).size
    : 0

  // Track optimistic state
  const reservingProductId = state.phase === 'reserving' ? state.product?.id ?? null : null
  const reservedProductIds = new Set(
    state.phase === 'active' && state.product ? [state.product.id] : []
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <MetricsStrip
        totalProducts={products.length}
        totalWarehouses={totalWarehouses}
        totalAvailableItems={totalAvailable}
        activeReservations={state.phase === 'active' ? 1 : 0}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Available Inventory
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Select a product to lock inventory for 10 minutes
            </p>
          </div>
          {!loading && !error && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {products.length} product{products.length !== 1 ? 's' : ''} · auto-refreshes every 30s
            </span>
          )}
        </div>

        <ProductGrid
          products={products}
          loading={loading}
          error={error}
          onReserve={handleReserve}
          onRetry={refresh}
          reservingProductId={reservingProductId}
          reservedProductIds={reservedProductIds}
        />
      </main>

      <ReservationDrawer
        state={state}
        onClose={closeDrawer}
        onSetWarehouse={setWarehouse}
        onSetQty={setQty}
        onReserve={reserve}
        onConfirm={confirm}
        onRelease={release}
        onExpired={handleExpired}
      />
    </div>
  )
}
```

### Task 2 — Mobile bottom sheet for drawer

Add mobile override to `ReservationDrawer.tsx` using Tailwind responsive classes.

Update the drawer motion div:

```tsx
// In ReservationDrawer.tsx — replace the motion.div for the panel:
<motion.div
  key="drawer"
  // Desktop: slide from right. Mobile handled by CSS max-w + position
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="
    fixed right-0 bottom-0 top-0 z-50 flex flex-col
    w-full sm:max-w-sm
    glass border-l border-[var(--color-border)] shadow-2xl shadow-black/50
  "
>
```

For true mobile bottom sheet, add a `useMediaQuery` check or CSS-only override:
```css
/* Add to globals.css @layer utilities */
@media (max-width: 640px) {
  .drawer-panel {
    top: auto !important;
    height: 90dvh;
    border-left: none !important;
    border-top: 1px solid var(--color-border);
    border-radius: 1.25rem 1.25rem 0 0;
  }
}
```

And add `.drawer-panel` class to the motion.div.

### Task 3 — Smoke test against dev server

With `npm run dev` running:

```bash
# 1. Visit http://localhost:3000 — should show dark page with Navbar, MetricsStrip, product cards
curl -s http://localhost:3000 | grep -i "Available Inventory" | wc -l
# Expected: 0 (it's client-rendered) but no error

# 2. Verify GET /api/products is called and returns data
curl -s http://localhost:3000/api/products | jq 'length'
# Expected: 3

# 3. Manual browser check:
#    - Products load with glassmorphic cards
#    - Hover lifts cards
#    - Reserve button opens drawer from right
#    - Countdown timer shows and ticks
#    - Confirm/Release buttons work
```

### Task 4 — TypeScript full check + commit

```bash
npx tsc --noEmit 2>&1 | head -20
git add -A
git commit -m "feat(04-E): wire up page.tsx — full inventory dashboard with drawer"
```

### Task 5 — Final git summary commit for Phase 4

```bash
git commit --allow-empty -m "chore(04): phase 4 complete — premium dark inventory UI"
```

---

## Verification

- [ ] `app/page.tsx` renders without runtime errors
- [ ] Navbar shows brand logo, "Live" indicator, metadata
- [ ] MetricsStrip shows correct counts from API data
- [ ] Product grid shows 3 cards with glassmorphic styling
- [ ] Cards have staggered entrance animation
- [ ] Hover on card produces lift effect
- [ ] Reserve button shows "Locking inventory..." spinner during API call
- [ ] Drawer slides in from right on click
- [ ] Drawer shows warehouse selector when multiple warehouses have stock
- [ ] CountdownTimer shows and ticks down in JetBrains Mono
- [ ] Timer turns amber < 2 min, red + pulse < 30s
- [ ] Confirm Payment calls POST /:id/confirm → success state
- [ ] Cancel calls POST /:id/release → released state
- [ ] Product card shows "✓ Reserved" badge while drawer active
- [ ] Responsive: drawer fills screen on mobile
- [ ] `npx tsc --noEmit` exits 0
