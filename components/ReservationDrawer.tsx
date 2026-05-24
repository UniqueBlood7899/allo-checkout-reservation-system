'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { ProductAvatar } from './ProductAvatar'
import { StockPill } from './StockPill'
import { CountdownTimer } from './CountdownTimer'
import type { ReservationState } from '@/app/hooks/useReservation'

interface ReservationDrawerProps {
  state: ReservationState
  onClose: () => void
  onSetWarehouse: (id: string) => void
  onSetQty: (qty: number) => void
  onReserve: () => void
  onRelease: () => void
  onExpired: () => void
}

export function ReservationDrawer({
  state,
  onClose,
  onSetWarehouse,
  onSetQty,
  onReserve,
  onRelease,
  onExpired,
}: ReservationDrawerProps) {
  const router = useRouter()
  const isOpen = state.phase !== 'idle'
  const { product, warehouseId, qty, reservation, phase, errorMessage } = state

  const selectedInv = product?.inventory.find((i) => i.warehouseId === warehouseId)
  const maxQty = selectedInv?.availableQty ?? 1

  // Warehouses with stock for the selector
  const stockedWarehouses = product?.inventory.filter((i) => i.availableQty > 0) ?? []
  const showWarehouseSelector = stockedWarehouses.length > 1

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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:max-w-sm z-50 flex flex-col drawer-panel"
            style={{
              background: 'rgba(11,16,32,0.97)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '-4px 0 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                {product && <ProductAvatar name={product.name} size="sm" />}
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f8fafc' }}>
                    {product?.name}
                  </p>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    Inventory lock request
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

              {/* ── Active: Countdown timer ─────────────────────────────── */}
              {phase === 'active' && reservation && (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(26,34,53,0.7)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  <CountdownTimer expiresAt={reservation.expiresAt} onExpired={onExpired} />
                </div>
              )}

              {/* ── Confirmed ──────────────────────────────────────────── */}
              {phase === 'confirmed' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-10 text-center"
                >
                  <CheckCircle className="w-14 h-14" style={{ color: '#10b981' }} />
                  <p className="text-xl font-bold" style={{ color: '#10b981' }}>Payment Confirmed</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    Inventory secured and payment confirmed successfully.
                  </p>
                </motion.div>
              )}

              {/* ── Released ───────────────────────────────────────────── */}
              {phase === 'released' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-10 text-center"
                >
                  <XCircle className="w-14 h-14" style={{ color: '#475569' }} />
                  <p className="text-xl font-bold" style={{ color: '#94a3b8' }}>Reservation Released</p>
                  <p className="text-sm" style={{ color: '#475569' }}>
                    The inventory lock has been released back to stock.
                  </p>
                </motion.div>
              )}

              {/* ── Error ──────────────────────────────────────────────── */}
              {phase === 'error' && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                      Reservation Failed
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Selecting / Error retry form ────────────────────────── */}
              {(phase === 'selecting' || phase === 'error') && product && (
                <>
                  {/* Warehouse selector */}
                  {showWarehouseSelector && (
                    <div className="flex flex-col gap-2">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: '#475569' }}
                      >
                        Select Warehouse
                      </p>
                      <div className="flex flex-col gap-2">
                        {product.inventory.map((inv) => (
                          <button
                            key={inv.warehouseId}
                            disabled={inv.availableQty === 0}
                            onClick={() => onSetWarehouse(inv.warehouseId)}
                            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
                            style={{
                              border: warehouseId === inv.warehouseId
                                ? '1px solid rgba(99,102,241,0.45)'
                                : '1px solid rgba(255,255,255,0.06)',
                              background: warehouseId === inv.warehouseId
                                ? 'rgba(99,102,241,0.08)'
                                : 'rgba(26,34,53,0.5)',
                              opacity: inv.availableQty === 0 ? 0.35 : 1,
                              cursor: inv.availableQty === 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>
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
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: '#475569' }}
                    >
                      Quantity
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onSetQty(Math.max(1, qty - 1))}
                        disabled={qty <= 1}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          border: '1px solid rgba(99,102,241,0.15)',
                          color: qty <= 1 ? '#475569' : '#94a3b8',
                          opacity: qty <= 1 ? 0.3 : 1,
                        }}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className="text-2xl font-bold font-mono-timer w-10 text-center"
                        style={{ color: '#f8fafc' }}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={() => onSetQty(Math.min(maxQty, qty + 1))}
                        disabled={qty >= maxQty}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          border: '1px solid rgba(99,102,241,0.15)',
                          color: qty >= maxQty ? '#475569' : '#94a3b8',
                          opacity: qty >= maxQty ? 0.3 : 1,
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs" style={{ color: '#475569' }}>
                        of {maxQty} available
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="p-5 flex flex-col gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Reserve CTA */}
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

              {/* Reserving loading */}
              {phase === 'reserving' && (
                <div
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', opacity: 0.8 }}
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 rounded-full"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  Locking inventory...
                </div>
              )}

              {/* Active: Go to Checkout + Cancel */}
              {phase === 'active' && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (reservation?.id) {
                        router.push(`/checkout/${reservation.id}`)
                      }
                    }}
                    className="w-full btn-reserve py-3 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Go to Checkout
                  </motion.button>
                  <button
                    onClick={onRelease}
                    className="w-full py-2.5 text-sm transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                  >
                    Cancel reservation
                  </button>
                </>
              )}

              {/* Terminal states: close */}
              {(phase === 'confirmed' || phase === 'released') && (
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm transition-all"
                  style={{
                    border: '1px solid rgba(99,102,241,0.15)',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                    e.currentTarget.style.color = '#a5b4fc'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'
                    e.currentTarget.style.color = '#94a3b8'
                  }}
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
