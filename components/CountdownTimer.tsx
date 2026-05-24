'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface CountdownTimerProps {
  expiresAt: string
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
  const totalDuration = 10 * 60 * 1000

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
      <div className="flex flex-col items-center gap-2 py-3">
        <span className="text-lg font-bold" style={{ color: '#ef4444' }}>Lock Expired</span>
        <p className="text-sm text-center" style={{ color: '#475569' }}>
          Your inventory lock has expired. Please start a new reservation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
        Inventory lock expires in
      </p>

      {/* Large monospace countdown */}
      <motion.div
        animate={{ color }}
        transition={{ duration: 0.6 }}
        className={`font-mono-timer text-5xl font-bold tracking-tight leading-none ${
          urgency === 'urgent' ? 'pulse-red' : ''
        }`}
      >
        {m}:{s}
      </motion.div>

      {/* Shrinking progress bar */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          animate={{ width: `${progressPct}%`, backgroundColor: color }}
          transition={{ duration: 0.5, ease: 'linear' as const }}
          className="h-full rounded-full"
        />
      </div>

      {urgency === 'warn' && (
        <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>
          ⚠ Lock expiring soon
        </p>
      )}
      {urgency === 'urgent' && (
        <p className="text-xs font-bold animate-pulse" style={{ color: '#ef4444' }}>
          ⚡ Less than 30 seconds remaining!
        </p>
      )}
    </div>
  )
}
