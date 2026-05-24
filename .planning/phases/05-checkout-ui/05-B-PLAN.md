# Plan 05-B: Checkout Page — `app/checkout/[id]/page.tsx`

**Phase:** 05 — Checkout UI
**Plan:** B — Checkout page with full reservation detail view
**Depends on:** Plan A (GET /api/reservations/:id), Phase 4 (CountdownTimer, design system)
**Status:** Ready to execute

---

## Goal

Build `app/checkout/[id]/page.tsx` — the dedicated checkout page reached after a
reservation is created. Shows the full reservation state: product info, timer,
confirm/cancel. Handles all error states: expired (410), conflict (409), not found (404),
network errors.

**This page is also reachable via direct URL** (e.g. sharing a checkout link),
so it must load its own reservation data on mount via `GET /api/reservations/:id`.

---

## Tasks

### Task 1 — Create `app/hooks/useCheckout.ts`

Manages checkout page state independently — separate from `useReservation` (which is
drawer-only).

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CheckoutReservation {
  id: string
  status: string
  qty: number
  expiresAt: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
    price: string
    description: string
  }
  warehouse: {
    id: string
    name: string
    location: string
  }
}

export type CheckoutPhase =
  | 'loading'
  | 'ready'        // reservation loaded, pending — show timer + confirm/cancel
  | 'confirming'   // confirm API call in flight
  | 'releasing'    // cancel API call in flight
  | 'confirmed'    // POST /confirm succeeded
  | 'released'     // POST /release succeeded (or was already released)
  | 'expired'      // timer hit 0 or API returned 410
  | 'not_found'    // 404 — reservation doesn't exist
  | 'error'        // unexpected error

export function useCheckout(reservationId: string) {
  const [phase, setPhase] = useState<CheckoutPhase>('loading')
  const [reservation, setReservation] = useState<CheckoutReservation | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load reservation on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/reservations/${reservationId}`)
        if (cancelled) return

        if (res.status === 404) {
          setPhase('not_found')
          return
        }
        if (!res.ok) {
          setPhase('error')
          setErrorMessage('Failed to load reservation')
          return
        }

        const data: CheckoutReservation = await res.json()

        // If already in a terminal state, reflect it
        if (data.status === 'confirmed') { setPhase('confirmed'); setReservation(data); return }
        if (data.status === 'released')  { setPhase('released');  setReservation(data); return }
        if (data.status === 'expired')   { setPhase('expired');   setReservation(data); return }

        // Check if already past expiry before setting ready
        if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
          setPhase('expired')
          setReservation(data)
          return
        }

        setReservation(data)
        setPhase('ready')
      } catch {
        if (!cancelled) {
          setPhase('error')
          setErrorMessage('Network error — could not load reservation')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [reservationId])

  const handleExpired = useCallback(() => {
    setPhase('expired')
  }, [])

  const confirm = useCallback(async () => {
    setPhase('confirming')
    try {
      const res = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: 'POST',
      })
      if (res.status === 200) {
        setPhase('confirmed')
      } else if (res.status === 410) {
        setPhase('expired')
      } else {
        const data = await res.json()
        setPhase('error')
        setErrorMessage(data.error ?? 'Confirmation failed')
      }
    } catch {
      setPhase('error')
      setErrorMessage('Network error during confirmation')
    }
  }, [reservationId])

  const release = useCallback(async () => {
    setPhase('releasing')
    try {
      await fetch(`/api/reservations/${reservationId}/release`, { method: 'POST' })
      setPhase('released')
    } catch {
      // Degrade gracefully — treat as released
      setPhase('released')
    }
  }, [reservationId])

  return { phase, reservation, errorMessage, confirm, release, handleExpired }
}
```

### Task 2 — Create `app/checkout/[id]/page.tsx`

```tsx
'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Package,
  MapPin,
  Hash,
  DollarSign,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { CountdownTimer } from '@/components/CountdownTimer'
import { ProductAvatar } from '@/components/ProductAvatar'
import { useCheckout } from '@/app/hooks/useCheckout'

// Next.js 16 App Router: params is a Promise
export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { phase, reservation, errorMessage, confirm, release, handleExpired } =
    useCheckout(id)

  const goBack = () => router.push('/')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B1020' }}>
      <Navbar />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Back link */}
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to inventory
          </button>

          <AnimatePresence mode="wait">
            {/* ── Loading ─────────────────────────────────────────── */}
            {phase === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-2 rounded-full"
                  style={{ borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }}
                />
                <p style={{ color: '#475569' }}>Loading reservation...</p>
              </motion.div>
            )}

            {/* ── Not Found ───────────────────────────────────────── */}
            {phase === 'not_found' && (
              <motion.div
                key="not_found"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-20 text-center"
              >
                <XCircle className="w-14 h-14" style={{ color: '#475569' }} />
                <p className="text-xl font-bold" style={{ color: '#94a3b8' }}>
                  Reservation Not Found
                </p>
                <p className="text-sm" style={{ color: '#475569' }}>
                  This reservation doesn't exist or may have been cleaned up.
                </p>
                <button onClick={goBack} className="btn-reserve mt-2 flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Unexpected Error ─────────────────────────────────── */}
            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl flex flex-col gap-4"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <div>
                    <p className="font-semibold" style={{ color: '#ef4444' }}>Error</p>
                    <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{errorMessage}</p>
                  </div>
                </div>
                <button onClick={goBack} className="btn-reserve flex items-center gap-2 self-start">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Confirmed ────────────────────────────────────────── */}
            {phase === 'confirmed' && (
              <motion.div
                key="confirmed"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="flex flex-col items-center gap-5 py-16 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                  <CheckCircle className="w-20 h-20" style={{ color: '#10b981' }} />
                </motion.div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                    Payment Confirmed
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
                    Your order has been confirmed and inventory secured.
                  </p>
                </div>
                {reservation && (
                  <div
                    className="w-full p-4 rounded-xl text-left"
                    style={{
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10b981' }}>
                      Order Summary
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{reservation.product.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                      {reservation.qty} unit{reservation.qty > 1 ? 's' : ''} · {reservation.warehouse.name}
                    </p>
                  </div>
                )}
                <button onClick={goBack} className="btn-reserve flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Released ─────────────────────────────────────────── */}
            {phase === 'released' && (
              <motion.div
                key="released"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-5 py-16 text-center"
              >
                <XCircle className="w-16 h-16" style={{ color: '#475569' }} />
                <div>
                  <p className="text-xl font-bold" style={{ color: '#94a3b8' }}>
                    Reservation Cancelled
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#475569' }}>
                    Inventory has been released back to stock.
                  </p>
                </div>
                <button onClick={goBack} className="btn-reserve flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Browse inventory
                </button>
              </motion.div>
            )}

            {/* ── Expired ──────────────────────────────────────────── */}
            {phase === 'expired' && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-5 py-16 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: 3, duration: 0.4 }}
                >
                  <Clock className="w-16 h-16" style={{ color: '#ef4444' }} />
                </motion.div>
                <div>
                  <p className="text-xl font-bold" style={{ color: '#ef4444' }}>
                    Reservation Expired
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#475569' }}>
                    Your inventory lock has expired. Please reserve again.
                  </p>
                </div>
                <button onClick={goBack} className="btn-reserve flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Reserve again
                </button>
              </motion.div>
            )}

            {/* ── Ready (active reservation) ───────────────────────── */}
            {(phase === 'ready' || phase === 'confirming' || phase === 'releasing') &&
              reservation && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4"
                >
                  {/* Header card */}
                  <div
                    className="p-5 rounded-2xl flex items-start gap-4"
                    style={{
                      background: 'rgba(17,24,39,0.8)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    <ProductAvatar name={reservation.product.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl font-bold leading-snug" style={{ color: '#f8fafc' }}>
                        {reservation.product.name}
                      </h1>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: '#94a3b8' }}
                        >
                          <Hash className="w-3 h-3" style={{ color: '#475569' }} />
                          {reservation.product.sku}
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: '#94a3b8' }}
                        >
                          <DollarSign className="w-3 h-3" style={{ color: '#475569' }} />
                          {parseFloat(reservation.product.price).toFixed(2)}
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: '#94a3b8' }}
                        >
                          <Package className="w-3 h-3" style={{ color: '#475569' }} />
                          {reservation.qty} unit{reservation.qty > 1 ? 's' : ''}
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: '#94a3b8' }}
                        >
                          <MapPin className="w-3 h-3" style={{ color: '#475569' }} />
                          {reservation.warehouse.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Countdown timer card */}
                  {reservation.expiresAt && (
                    <div
                      className="p-5 rounded-2xl"
                      style={{
                        background: 'rgba(17,24,39,0.8)',
                        border: '1px solid rgba(99,102,241,0.15)',
                      }}
                    >
                      <CountdownTimer
                        expiresAt={reservation.expiresAt}
                        onExpired={handleExpired}
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    {/* Confirm Payment */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={confirm}
                      disabled={phase === 'confirming' || phase === 'releasing'}
                      className="w-full btn-reserve py-4 flex items-center justify-center gap-2 text-base"
                    >
                      {phase === 'confirming' ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                            className="inline-block w-4 h-4 border-2 rounded-full"
                            style={{
                              borderColor: 'rgba(255,255,255,0.3)',
                              borderTopColor: 'white',
                            }}
                          />
                          Confirming payment...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirm Payment
                        </>
                      )}
                    </motion.button>

                    {/* Cancel reservation */}
                    <button
                      onClick={release}
                      disabled={phase === 'confirming' || phase === 'releasing'}
                      className="w-full py-3 text-sm transition-colors disabled:opacity-40"
                      style={{ color: '#475569' }}
                      onMouseEnter={(e) =>
                        phase === 'ready' && (e.currentTarget.style.color = '#ef4444')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = '#475569')
                      }
                    >
                      {phase === 'releasing' ? 'Cancelling...' : 'Cancel reservation'}
                    </button>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
```

### Task 3 — Update `app/checkout/[id]/page.tsx` metadata export

Add a `generateMetadata` above the component for SEO:

```typescript
// Add BEFORE the default export
export const metadata = {
  title: 'Checkout — Allo Inventory',
  description: 'Complete your inventory reservation',
}
```

> **Note:** Since the page is `'use client'`, metadata must come from the layout or a separate server component wrapper. Skip static metadata for now — the Navbar title is sufficient.

### Task 4 — Wire Reserve button in `ReservationDrawer` to navigate to checkout

After a successful reservation (phase transitions to `'active'`), the drawer currently shows the countdown inline. For Phase 5, when the user clicks "Confirm Payment" in the drawer, **redirect to `/checkout/:id`** instead of handling it in-drawer.

Update `components/ReservationDrawer.tsx` — in the `active` phase footer:

```tsx
// Replace the Confirm Payment button in the active phase footer:
import { useRouter } from 'next/navigation'

// Inside ReservationDrawer component:
const router = useRouter()

// In the active phase footer:
<motion.button
  whileTap={{ scale: 0.97 }}
  onClick={() => {
    if (reservation?.id) {
      router.push(`/checkout/${reservation.id}`)
    }
  }}
  className="w-full btn-reserve py-3 flex items-center justify-center gap-2"
>
  <CheckCircle className="w-4 h-4" />
  Go to Checkout
</motion.button>
```

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/checkout/ app/hooks/useCheckout.ts components/ReservationDrawer.tsx
git commit -m "feat(05-B): checkout page with full reservation flow, timer, confirm/cancel"
```

---

## Verification

- [ ] `GET /checkout/:id` renders Navbar + product card + countdown timer + action buttons
- [ ] Loading spinner while `GET /api/reservations/:id` in flight
- [ ] 404 reservation ID → "Reservation Not Found" state + back button
- [ ] Timer ticks in real-time using `expiresAt`
- [ ] Timer hits 0 → `handleExpired` called → "Reservation Expired" state
- [ ] Confirm Payment → spinner → "Payment Confirmed" success state
- [ ] Cancel → "Reservation Cancelled" state + "Browse inventory" back button
- [ ] Reserve in drawer → "Go to Checkout" navigates to `/checkout/:id`
- [ ] Confirmed/released already in DB → renders correct terminal state on load
- [ ] `npx tsc --noEmit` exits 0
