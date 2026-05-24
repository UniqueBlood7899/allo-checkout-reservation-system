# Plan 04-B: Navbar, MetricsStrip, ProductAvatar, StockPill

**Phase:** 04 — Product Listing UI
**Plan:** B — Shell Components
**Depends on:** Plan A (design system + shadcn)
**Status:** Ready to execute

---

## Goal

Build the page shell components — all stateless/presentational:
- `components/Navbar.tsx` — sticky glassmorphic top bar
- `components/MetricsStrip.tsx` — live inventory metrics band
- `components/ProductAvatar.tsx` — category-matched lucide icon in gradient circle
- `components/StockPill.tsx` — emerald/amber/red stock status badge

---

## Tasks

### Task 1 — Create `components/Navbar.tsx`

```tsx
'use client'

import { motion } from 'framer-motion'
import { Activity, Package, Zap } from 'lucide-react'

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 glass border-b border-[var(--color-border)]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-wide">
              ALLO
            </span>
            <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1.5">
              Inventory Operations
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[var(--color-text-secondary)]">Live</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Activity className="w-3.5 h-3.5" />
            <span>Real-time stock</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Package className="w-3.5 h-3.5" />
            <span>Reserve & lock</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
```

### Task 2 — Create `components/MetricsStrip.tsx`

```tsx
'use client'

import { motion } from 'framer-motion'
import { Package, Warehouse, TrendingUp, Clock } from 'lucide-react'

interface MetricsStripProps {
  totalProducts: number
  totalWarehouses: number
  totalAvailableItems: number
  activeReservations?: number
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 px-5 py-3"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-[var(--color-text-primary)] leading-none">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

export function MetricsStrip({
  totalProducts,
  totalWarehouses,
  totalAvailableItems,
  activeReservations = 0,
}: MetricsStripProps) {
  return (
    <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center divide-x divide-[var(--color-border-subtle)] overflow-x-auto">
          <MetricCard icon={Package} label="Products" value={totalProducts} color="bg-indigo-500/20 text-indigo-400" delay={0.1} />
          <MetricCard icon={Warehouse} label="Warehouses" value={totalWarehouses} color="bg-cyan-500/20 text-cyan-400" delay={0.15} />
          <MetricCard icon={TrendingUp} label="Available Units" value={totalAvailableItems} color="bg-emerald-500/20 text-emerald-400" delay={0.2} />
          <MetricCard icon={Clock} label="Active Locks" value={activeReservations} color="bg-amber-500/20 text-amber-400" delay={0.25} />
        </div>
      </div>
    </div>
  )
}
```

### Task 3 — Create `components/ProductAvatar.tsx`

```tsx
import { Package, Headphones, Backpack, Footprints } from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  headphones: Headphones,
  shoes: Footprints,
  backpack: Backpack,
}

const GRADIENT_MAP: Record<string, string> = {
  headphones: 'from-violet-600 to-indigo-500',
  shoes: 'from-cyan-600 to-blue-500',
  backpack: 'from-indigo-600 to-purple-500',
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('headphone') || lower.includes('audio')) return 'headphones'
  if (lower.includes('shoe') || lower.includes('boot') || lower.includes('sneaker') || lower.includes('running')) return 'shoes'
  if (lower.includes('bag') || lower.includes('backpack') || lower.includes('pack')) return 'backpack'
  return 'default'
}

export function ProductAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const category = detectCategory(name)
  const Icon = ICON_MAP[category] ?? Package
  const gradient = GRADIENT_MAP[category] ?? 'from-indigo-600 to-indigo-400'

  const sizes = {
    sm: { outer: 'w-10 h-10', icon: 'w-5 h-5' },
    md: { outer: 'w-14 h-14', icon: 'w-7 h-7' },
    lg: { outer: 'w-20 h-20', icon: 'w-10 h-10' },
  }

  return (
    <div
      className={`${sizes[size].outer} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
    >
      <Icon className={`${sizes[size].icon} text-white`} />
    </div>
  )
}
```

### Task 4 — Create `components/StockPill.tsx`

```tsx
export type StockLevel = 'healthy' | 'low' | 'empty'

export function getStockLevel(qty: number): StockLevel {
  if (qty === 0) return 'empty'
  if (qty <= 5) return 'low'
  return 'healthy'
}

const CONFIG = {
  healthy: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    label: 'In Stock',
    pulse: false,
  },
  low: {
    dot: 'bg-amber-400 pulse-amber',
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    label: 'Low Stock',
    pulse: true,
  },
  empty: {
    dot: 'bg-red-500',
    text: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    label: 'Out of Stock',
    pulse: false,
  },
}

export function StockPill({ qty, showCount = false }: { qty: number; showCount?: boolean }) {
  const level = getStockLevel(qty)
  const cfg = CONFIG[level]

  return (
    <span
      className={`stock-pill ${cfg.bg} border ${cfg.border} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {showCount && qty > 0 && (
        <span className="opacity-60 font-normal">({qty})</span>
      )}
    </span>
  )
}
```

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add components/
git commit -m "feat(04-B): add Navbar, MetricsStrip, ProductAvatar, StockPill components"
```

---

## Verification

- [ ] `components/Navbar.tsx` renders sticky glassmorphic header
- [ ] `components/MetricsStrip.tsx` accepts product/warehouse counts
- [ ] `components/ProductAvatar.tsx` maps category names to correct lucide icons
- [ ] `components/StockPill.tsx` shows correct color for healthy/low/empty
- [ ] `npx tsc --noEmit` exits 0
