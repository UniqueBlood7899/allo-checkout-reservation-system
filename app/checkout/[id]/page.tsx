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

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Next.js 16: params is a Promise — unwrap with React use()
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
            {/* ── Loading ──────────────────────────────────────────── */}
            {phase === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-24"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' as const }}
                  className="w-10 h-10 border-2 rounded-full"
                  style={{ borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }}
                />
                <p style={{ color: '#475569' }}>Loading reservation...</p>
              </motion.div>
            )}

            {/* ── Not Found ─────────────────────────────────────────── */}
            {phase === 'not_found' && (
              <motion.div
                key="not_found"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-20 text-center"
              >
                <XCircle className="w-14 h-14" style={{ color: '#475569' }} />
                <div>
                  <p className="text-xl font-bold" style={{ color: '#94a3b8' }}>
                    Reservation Not Found
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#475569' }}>
                    This reservation doesn&apos;t exist or may have been cleaned up.
                  </p>
                </div>
                <button onClick={goBack} className="btn-reserve flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Error ─────────────────────────────────────────────── */}
            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
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
                <button onClick={goBack} className="btn-reserve self-start flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Confirmed ─────────────────────────────────────────── */}
            {phase === 'confirmed' && (
              <motion.div
                key="confirmed"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="flex flex-col items-center gap-6 py-16 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
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
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                      style={{ color: '#10b981' }}
                    >
                      Order Summary
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
                      {reservation.product.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                      {reservation.qty} unit{reservation.qty > 1 ? 's' : ''} ·{' '}
                      {reservation.warehouse.name}
                    </p>
                  </div>
                )}
                <button onClick={goBack} className="btn-reserve flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to inventory
                </button>
              </motion.div>
            )}

            {/* ── Released ──────────────────────────────────────────── */}
            {phase === 'released' && (
              <motion.div
                key="released"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-20 text-center"
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

            {/* ── Expired ───────────────────────────────────────────── */}
            {phase === 'expired' && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-20 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
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

            {/* ── Ready / Confirming / Releasing ────────────────────── */}
            {(phase === 'ready' || phase === 'confirming' || phase === 'releasing') &&
              reservation && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col gap-4"
                >
                  {/* Product summary card */}
                  <div
                    className="p-5 rounded-2xl flex items-start gap-4"
                    style={{
                      background: 'rgba(17,24,39,0.8)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}
                  >
                    <ProductAvatar name={reservation.product.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h1
                        className="text-xl font-bold leading-snug"
                        style={{ color: '#f8fafc' }}
                      >
                        {reservation.product.name}
                      </h1>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
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

                  {/* Countdown timer */}
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
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={confirm}
                      disabled={phase !== 'ready'}
                      className="w-full btn-reserve py-4 flex items-center justify-center gap-2 text-base"
                    >
                      {phase === 'confirming' ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.75,
                              ease: 'linear' as const,
                            }}
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

                    <button
                      onClick={release}
                      disabled={phase !== 'ready'}
                      className="w-full py-3 text-sm transition-colors disabled:opacity-40"
                      style={{ color: '#475569' }}
                      onMouseEnter={(e) => {
                        if (phase === 'ready') e.currentTarget.style.color = '#ef4444'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#475569'
                      }}
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
