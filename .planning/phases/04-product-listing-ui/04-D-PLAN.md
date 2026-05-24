# Plan 04-D: ReservationDrawer & useReservation Hook

**Phase:** 04 — Product Listing UI
**Plan:** D — Reservation Interaction Layer
**Depends on:** Plan C (ProductCard, useProducts types)
**Status:** Ready to execute

---

## Goal

1. `app/hooks/useReservation.ts` — manages drawer state, API calls (POST reserve/confirm/release), optimistic updates
2. `components/CountdownTimer.tsx` — monospace urgency timer with animated progress bar
3. `components/ReservationDrawer.tsx` — slide-in panel with warehouse selector, reserve form, countdown, confirm/cancel

---

## Tasks

### Task 1 — Create `app/hooks/useReservation.ts`

```typescript
'use client'

import { useState, useCallback } from 'react'
import type { Product } from './useProducts'

export type DrawerPhase = 'idle' | 'selecting' | 'reserving' | 'active' | 'confirmed' | 'released' | 'error'

export interface ActiveReservation {
  id: string
  productId: string
  warehouseId: string
  qty: number
  status: string
  expiresAt: string
}

export interface ReservationState {
  phase: DrawerPhase
  product: Product | null
  warehouseId: string | null
  qty: number
  reservation: ActiveReservation | null
  errorMessage: string | null
}

const INITIAL_STATE: ReservationState = {
  phase: 'idle',
  product: null,
  warehouseId: null,
  qty: 1,
  reservation: null,
  errorMessage: null,
}

export function useReservation(onSuccess?: () => void) {
  const [state, setState] = useState<ReservationState>(INITIAL_STATE)

  // Open drawer for a specific product+warehouse
  const openDrawer = useCallback((product: Product, warehouseId: string) => {
    setState({
      ...INITIAL_STATE,
      phase: 'selecting',
      product,
      warehouseId,
      qty: 1,
    })
  }, [])

  const closeDrawer = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const setWarehouse = useCallback((warehouseId: string) => {
    setState((prev) => ({ ...prev, warehouseId }))
  }, [])

  const setQty = useCallback((qty: number) => {
    setState((prev) => ({ ...prev, qty }))
  }, [])

  // POST /api/reservations
  const reserve = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: 'reserving', errorMessage: null }))

    const { product, warehouseId, qty } = state
    if (!product || !warehouseId) return

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, warehouseId, qty }),
      })

      const data = await res.json()

      if (res.status === 201) {
        setState((prev) => ({
          ...prev,
          phase: 'active',
          reservation: data,
        }))
        onSuccess?.()
      } else if (res.status === 409) {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage:
            data.code === 'OUT_OF_STOCK'
              ? 'Item is no longer available'
              : 'Reservation conflict — please retry',
        }))
      } else {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: data.error ?? 'Reservation failed',
        }))
      }
    } catch {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: 'Network error — please retry',
      }))
    }
  }, [state, onSuccess])

  // POST /api/reservations/:id/confirm
  const confirm = useCallback(async () => {
    if (!state.reservation) return
    try {
      const res = await fetch(`/api/reservations/${state.reservation.id}/confirm`, {
        method: 'POST',
      })
      if (res.status === 200) {
        setState((prev) => ({ ...prev, phase: 'confirmed' }))
        onSuccess?.()
      } else if (res.status === 410) {
        setState((prev) => ({ ...prev, phase: 'error', errorMessage: 'Reservation expired' }))
      } else {
        const data = await res.json()
        setState((prev) => ({ ...prev, phase: 'error', errorMessage: data.error }))
      }
    } catch {
      setState((prev) => ({ ...prev, phase: 'error', errorMessage: 'Network error' }))
    }
  }, [state.reservation, onSuccess])

  // POST /api/reservations/:id/release
  const release = useCallback(async () => {
    if (!state.reservation) return
    try {
      const res = await fetch(`/api/reservations/${state.reservation.id}/release`, {
        method: 'POST',
      })
      if (res.status === 200) {
        setState((prev) => ({ ...prev, phase: 'released' }))
        onSuccess?.()
      } else {
        setState((prev) => ({ ...prev, phase: 'released' })) // treat all non-200 as released for UX
      }
    } catch {
      setState((prev) => ({ ...prev, phase: 'released' }))
    }
  }, [state.reservation, onSuccess])

  return { state, openDrawer, closeDrawer, setWarehouse, setQty, reserve, confirm, release }
}
```

### Task 2 — Create `components/CountdownTimer.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CountdownTimerProps {
  expiresAt: string       // ISO string
  onExpired?: () => void
}

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return { m, s, totalSec }
}

type UrgencyLevel = 'safe' | 'warn' | 'urgent'

function getUrgency(totalSec: number): UrgencyLevel {
  if (totalSec <= 30) return 'urgent'
  if (totalSec <= 120) return 'warn'
  return 'safe'
}

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  safe: '#22d3ee',
  warn: '#f59e0b',
  urgent: '#ef4444',
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const expiry = new Date(expiresAt).getTime()
  const totalDuration = 10 * 60 * 1000 // 10 minutes in ms
  const startTime = expiry - totalDuration

  const [remaining, setRemaining] = useState(() => expiry - Date.now())

  useEffect(() => {
    const tick = setInterval(() => {
      const r = expiry - Date.now()
      setRemaining(r)
      if (r <= 0) {
        clearInterval(tick)
        onExpired?.()
      }
    }, 500)
    return () => clearInterval(tick)
  }, [expiry, onExpired])

  const { m, s, totalSec } = formatTime(remaining)
  const urgency = getUrgency(totalSec)
  const color = URGENCY_COLORS[urgency]
  const progressPct = Math.max(0, (remaining / totalDuration) * 100)
  const expired = remaining <= 0

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <span className="text-red-400 text-lg font-bold">Lock Expired</span>
        <p className="text-[var(--color-text-muted)] text-sm text-center">
          Your inventory lock has expired. Please start a new reservation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">
        Inventory lock expires in
      </p>

      {/* Large monospace digits */}
      <motion.div
        animate={{ color }}
        transition={{ duration: 0.5 }}
        className={`font-mono-timer text-5xl font-bold tracking-tight leading-none ${
          urgency === 'urgent' ? 'pulse-red' : ''
        }`}
      >
        {m}:{s}
      </motion.div>

      {/* Animated progress bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
        <motion.div
          animate={{ width: `${progressPct}%`, backgroundColor: color }}
          transition={{ duration: 0.5, ease: 'linear' }}
          className="h-full rounded-full"
        />
      </div>

      {urgency === 'warn' && (
        <p className="text-amber-400 text-xs font-medium">⚠ Lock expiring soon</p>
      )}
      {urgency === 'urgent' && (
        <p className="text-red-400 text-xs font-bold animate-pulse">
          ⚠ Less than 30 seconds remaining!
        </p>
      )}
    </div>
  )
}
```

### Task 3 — Create `components/ReservationDrawer.tsx`

```tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { ProductAvatar } from './ProductAvatar'
import { StockPill } from './StockPill'
import { CountdownTimer } from './CountdownTimer'
import type { ReservationState } from '@/app/hooks/useReservation'
import type { Product } from '@/app/hooks/useProducts'

interface ReservationDrawerProps {
  state: ReservationState
  onClose: () => void
  onSetWarehouse: (id: string) => void
  onSetQty: (qty: number) => void
  onReserve: () => void
  onConfirm: () => void
  onRelease: () => void
  onExpired: () => void
}

export function ReservationDrawer({
  state, onClose, onSetWarehouse, onSetQty,
  onReserve, onConfirm, onRelease, onExpired,
}: ReservationDrawerProps) {
  const isOpen = state.phase !== 'idle'
  const { product, warehouseId, qty, reservation, phase, errorMessage } = state

  const selectedInventory = product?.inventory.find((i) => i.warehouseId === warehouseId)
  const maxQty = selectedInventory?.availableQty ?? 1

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel — right drawer desktop, bottom sheet mobile */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-50 flex flex-col
                       glass border-l border-[var(--color-border)] shadow-2xl shadow-black/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-3">
                {product && <ProductAvatar name={product.name} size="sm" />}
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {product?.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Reserve inventory lock
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

              {/* Countdown timer — shows when reservation is active */}
              {phase === 'active' && reservation && (
                <div className="p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <CountdownTimer
                    expiresAt={reservation.expiresAt}
                    onExpired={onExpired}
                  />
                </div>
              )}

              {/* Success states */}
              {phase === 'confirmed' && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <p className="text-lg font-bold text-emerald-400">Payment Confirmed</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Your inventory has been reserved and payment confirmed.
                  </p>
                </div>
              )}

              {phase === 'released' && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <XCircle className="w-12 h-12 text-[var(--color-text-muted)]" />
                  <p className="text-lg font-bold text-[var(--color-text-secondary)]">Reservation Released</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    The inventory lock has been released.
                  </p>
                </div>
              )}

              {/* Error state */}
              {phase === 'error' && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Reservation Failed</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Selection form — shown when selecting or after error */}
              {(phase === 'selecting' || phase === 'error') && product && (
                <>
                  {/* Warehouse selector (only if multiple have stock) */}
                  {product.inventory.filter((i) => i.availableQty > 0).length > 1 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">
                        Select Warehouse
                      </p>
                      <div className="flex flex-col gap-2">
                        {product.inventory.map((inv) => (
                          <button
                            key={inv.warehouseId}
                            disabled={inv.availableQty === 0}
                            onClick={() => onSetWarehouse(inv.warehouseId)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200
                              ${warehouseId === inv.warehouseId
                                ? 'border-indigo-400/50 bg-indigo-500/10'
                                : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-active)]'
                              }
                              ${inv.availableQty === 0 ? 'opacity-40 cursor-not-allowed' : ''}
                            `}
                          >
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {inv.warehouseName}
                            </span>
                            <StockPill qty={inv.availableQty} showCount />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity selector */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">
                      Quantity
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onSetQty(Math.max(1, qty - 1))}
                        disabled={qty <= 1}
                        className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-indigo-400/40 hover:text-indigo-400 transition-all disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-2xl font-bold font-mono-timer text-[var(--color-text-primary)] w-10 text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => onSetQty(Math.min(maxQty, qty + 1))}
                        disabled={qty >= maxQty}
                        className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-indigo-400/40 hover:text-indigo-400 transition-all disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        of {maxQty} available
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-[var(--color-border-subtle)] flex flex-col gap-3">
              {/* Reserve button — shown when selecting/error */}
              {(phase === 'selecting' || phase === 'error') && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onReserve}
                  disabled={!warehouseId || maxQty === 0}
                  className="w-full btn-reserve py-3 flex items-center justify-center gap-2"
                >
                  Lock {qty} unit{qty > 1 ? 's' : ''} for 10 minutes
                </motion.button>
              )}

              {/* Reserving loading state */}
              {phase === 'reserving' && (
                <div className="w-full btn-reserve py-3 flex items-center justify-center gap-2 opacity-80">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Locking inventory...
                </div>
              )}

              {/* Confirm + Release — shown when reservation is active */}
              {phase === 'active' && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfirm}
                    className="w-full btn-reserve py-3 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </motion.button>
                  <button
                    onClick={onRelease}
                    className="w-full py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
                  >
                    Cancel reservation
                  </button>
                </>
              )}

              {/* Close button for terminal states */}
              {(phase === 'confirmed' || phase === 'released') && (
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-indigo-400/40 hover:text-indigo-300 transition-all"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### Task 4 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/hooks/useReservation.ts components/CountdownTimer.tsx components/ReservationDrawer.tsx
git commit -m "feat(04-D): add useReservation hook, CountdownTimer, ReservationDrawer"
```

---

## Verification

- [ ] `useReservation` phases: `idle → selecting → reserving → active → confirmed/released/error`
- [ ] `CountdownTimer` renders JetBrains Mono digits with color: cyan → amber → red
- [ ] Progress bar animates smoothly and shrinks over 10 minutes
- [ ] Urgency pulse activates at < 30s
- [ ] `ReservationDrawer` slides from right on desktop
- [ ] Warehouse selector only shows when multiple warehouses have stock
- [ ] Quantity +/- respects `maxQty`
- [ ] All `phase` states render correct UI
- [ ] `npx tsc --noEmit` exits 0
