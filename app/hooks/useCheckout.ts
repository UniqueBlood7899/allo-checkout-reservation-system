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
  | 'ready'        // pending — show timer + confirm/cancel
  | 'confirming'   // POST /confirm in flight
  | 'releasing'    // POST /release in flight
  | 'confirmed'    // confirmed successfully
  | 'released'     // released / cancelled
  | 'expired'      // timer hit 0 or API returned 410
  | 'not_found'    // 404
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

        if (res.status === 404) { setPhase('not_found'); return }
        if (!res.ok) {
          setPhase('error')
          setErrorMessage('Failed to load reservation')
          return
        }

        const data: CheckoutReservation = await res.json()
        setReservation(data)

        // Reflect terminal status from DB immediately
        if (data.status === 'confirmed') { setPhase('confirmed'); return }
        if (data.status === 'released')  { setPhase('released');  return }
        if (data.status === 'expired')   { setPhase('expired');   return }

        // Check if already past expiry
        if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
          setPhase('expired'); return
        }

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
      // Degrade gracefully — cron sweeper will clean up
      setPhase('released')
    }
  }, [reservationId])

  return { phase, reservation, errorMessage, confirm, release, handleExpired }
}
