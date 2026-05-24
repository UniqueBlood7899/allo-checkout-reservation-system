# Plan 04-C: ProductCard, WarehouseBar & useProducts Hook

**Phase:** 04 — Product Listing UI
**Plan:** C — Product Grid
**Depends on:** Plan B (StockPill, ProductAvatar)
**Status:** Ready to execute

---

## Goal

1. `app/hooks/useProducts.ts` — data fetching with 30s polling
2. `components/WarehouseBar.tsx` — mini inventory bar inside ProductCard
3. `components/ProductCard.tsx` — the main premium glassmorphic card with Framer Motion hover
4. `components/ProductGrid.tsx` — staggered grid with loading skeleton

---

## Tasks

### Task 1 — Create `app/hooks/useProducts.ts`

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'

export interface InventoryItem {
  warehouseId: string
  warehouseName: string
  availableQty: number
}

export interface Product {
  id: string
  name: string
  sku: string
  price: string
  inventory: InventoryItem[]
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data = await res.json()
      setProducts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    // Poll every 30 seconds for live stock updates
    const interval = setInterval(fetchProducts, 30_000)
    return () => clearInterval(interval)
  }, [fetchProducts])

  // Allow external components to trigger a manual refresh
  return { products, loading, error, refresh: fetchProducts }
}
```

### Task 2 — Create `components/WarehouseBar.tsx`

Mini fulfillment panel — appears inside ProductCard per warehouse:

```tsx
import { MapPin } from 'lucide-react'
import { StockPill } from './StockPill'

interface WarehouseBarProps {
  name: string
  location?: string
  availableQty: number
  maxQty?: number
}

export function WarehouseBar({ name, availableQty, maxQty = 100 }: WarehouseBarProps) {
  const pct = Math.min(100, (availableQty / Math.max(maxQty, 1)) * 100)

  const barColor =
    availableQty === 0 ? 'bg-red-500' :
    availableQty <= 5  ? 'bg-amber-400' :
                         'bg-emerald-400'

  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[var(--color-text-muted)]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate max-w-[120px]">
            {name}
          </span>
        </div>
        <StockPill qty={availableQty} showCount />
      </div>

      {/* Stock quantity bar */}
      <div className="w-full h-1 rounded-full bg-[var(--color-border-subtle)]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

### Task 3 — Create `components/ProductCard.tsx`

```tsx
'use client'

import { motion } from 'framer-motion'
import { DollarSign, ChevronRight } from 'lucide-react'
import { ProductAvatar } from './ProductAvatar'
import { WarehouseBar } from './WarehouseBar'
import { StockPill, getStockLevel } from './StockPill'
import type { Product } from '@/app/hooks/useProducts'

interface ProductCardProps {
  product: Product
  onReserve: (product: Product, warehouseId: string) => void
  index: number
  isReserving?: boolean
  optimisticReserved?: boolean
}

// Stagger animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

export function ProductCard({
  product,
  onReserve,
  index,
  isReserving = false,
  optimisticReserved = false,
}: ProductCardProps) {
  const totalAvailable = product.inventory.reduce((s, i) => s + i.availableQty, 0)
  const overallLevel = getStockLevel(totalAvailable)
  const hasStock = totalAvailable > 0

  // Prefer first warehouse with stock, fall back to first
  const defaultWarehouse =
    product.inventory.find((i) => i.availableQty > 0) ?? product.inventory[0]

  // Find max qty across all warehouses for bar scaling
  const maxQty = Math.max(...product.inventory.map((i) => i.availableQty), 1)

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        relative flex flex-col gap-4 p-5 rounded-2xl
        glass glass-hover glow-indigo
        transition-all duration-300
        ${optimisticReserved ? 'border-emerald-400/40 shadow-emerald-400/10 shadow-lg' : ''}
      `}
    >
      {/* Optimistic reserved badge */}
      {optimisticReserved && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full"
        >
          ✓ Reserved
        </motion.div>
      )}

      {/* Header: Avatar + Title + Price */}
      <div className="flex items-start gap-4">
        <ProductAvatar name={product.name} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] leading-tight truncate">
            {product.name}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
            {product.sku}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              <DollarSign className="w-3 h-3" />
              {parseFloat(product.price).toFixed(2)}
            </span>
            <StockPill qty={totalAvailable} />
          </div>
        </div>
      </div>

      {/* Warehouse distribution */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest">
          Warehouse Distribution
        </p>
        {product.inventory.map((inv) => (
          <WarehouseBar
            key={inv.warehouseId}
            name={inv.warehouseName}
            availableQty={inv.availableQty}
            maxQty={maxQty}
          />
        ))}
      </div>

      {/* Reserve CTA */}
      <div className="flex items-center justify-end mt-auto pt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!hasStock || isReserving || optimisticReserved}
          onClick={() => defaultWarehouse && onReserve(product, defaultWarehouse.warehouseId)}
          className="btn-reserve flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isReserving ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
              />
              Locking inventory...
            </>
          ) : optimisticReserved ? (
            '✓ Locked'
          ) : (
            <>
              Reserve
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
```

### Task 4 — Create `components/ProductGrid.tsx`

```tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { Product } from '@/app/hooks/useProducts'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  error: string | null
  onReserve: (product: Product, warehouseId: string) => void
  onRetry: () => void
  reservingProductId?: string | null
  reservedProductIds?: Set<string>
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl glass animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-raised)]" />
        <div className="flex-1 gap-2 flex flex-col">
          <div className="h-4 w-2/3 rounded bg-[var(--color-surface-raised)]" />
          <div className="h-3 w-1/3 rounded bg-[var(--color-surface-raised)]" />
          <div className="h-5 w-16 rounded-full bg-[var(--color-surface-raised)] mt-1" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/4 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-10 rounded-xl bg-[var(--color-surface-raised)]" />
        <div className="h-10 rounded-xl bg-[var(--color-surface-raised)]" />
      </div>
      <div className="flex justify-end">
        <div className="h-9 w-24 rounded-xl bg-[var(--color-surface-raised)]" />
      </div>
    </div>
  )
}

export function ProductGrid({
  products, loading, error, onReserve, onRetry,
  reservingProductId, reservedProductIds,
}: ProductGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <button onClick={onRetry} className="btn-reserve flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
    >
      <AnimatePresence>
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            onReserve={onReserve}
            isReserving={reservingProductId === product.id}
            optimisticReserved={reservedProductIds?.has(product.id) ?? false}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
```

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/hooks/useProducts.ts components/WarehouseBar.tsx components/ProductCard.tsx components/ProductGrid.tsx
git commit -m "feat(04-C): add useProducts hook, ProductCard, WarehouseBar, ProductGrid"
```

---

## Verification

- [ ] `useProducts` polls every 30s, returns `{ products, loading, error, refresh }`
- [ ] `ProductCard` renders with glassmorphism, stagger entrance, hover lift
- [ ] `WarehouseBar` shows correct color based on stock level
- [ ] `ProductGrid` shows skeleton while loading, error state with retry
- [ ] `npx tsc --noEmit` exits 0
