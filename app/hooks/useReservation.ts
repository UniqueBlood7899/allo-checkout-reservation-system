'use client'

import { useState, useCallback, useRef } from 'react'
import type { Product } from './useProducts'

export type DrawerPhase =
  | 'idle'
  | 'selecting'
  | 'reserving'
  | 'active'
  | 'confirmed'
  | 'released'
  | 'error'

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
  // Keep a mutable ref so reserve() can read latest state without needing it in deps
  const stateRef = useRef(state)
  stateRef.current = state

  const openDrawer = useCallback((product: Product, warehouseId: string) => {
    setState({ ...INITIAL_STATE, phase: 'selecting', product, warehouseId, qty: 1 })
  }, [])

  const closeDrawer = useCallback(() => setState(INITIAL_STATE), [])

  const setWarehouse = useCallback((warehouseId: string) => {
    setState((prev) => ({ ...prev, warehouseId }))
  }, [])

  const setQty = useCallback((qty: number) => {
    setState((prev) => ({ ...prev, qty }))
  }, [])

  // POST /api/reservations
  const reserve = useCallback(async () => {
    const { product, warehouseId, qty } = stateRef.current
    if (!product || !warehouseId) return

    setState((prev) => ({ ...prev, phase: 'reserving', errorMessage: null }))

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, warehouseId, qty }),
      })
      const data = await res.json()

      if (res.status === 201) {
        setState((prev) => ({ ...prev, phase: 'active', reservation: data }))
        onSuccess?.()
      } else if (res.status === 409) {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage:
            data.code === 'OUT_OF_STOCK'
              ? 'Item is no longer available — stock may have changed'
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
        errorMessage: 'Network error — check your connection',
      }))
    }
  }, [onSuccess])


  // POST /api/reservations/:id/confirm
  const confirm = useCallback(async () => {
    const { reservation } = state
    if (!reservation) return
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: 'POST',
      })
      if (res.status === 200) {
        setState((prev) => ({ ...prev, phase: 'confirmed' }))
        onSuccess?.()
      } else if (res.status === 410) {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: 'Reservation expired before confirmation',
        }))
      } else {
        const data = await res.json()
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: data.error ?? 'Confirmation failed',
        }))
      }
    } catch {
      setState((prev) => ({ ...prev, phase: 'error', errorMessage: 'Network error' }))
    }
  }, [state, onSuccess])

  // POST /api/reservations/:id/release
  const release = useCallback(async () => {
    const { reservation } = state
    if (!reservation) return
    try {
      await fetch(`/api/reservations/${reservation.id}/release`, { method: 'POST' })
      setState((prev) => ({ ...prev, phase: 'released' }))
      onSuccess?.()
    } catch {
      // Treat network error as released for UX — the cron will clean up
      setState((prev) => ({ ...prev, phase: 'released' }))
    }
  }, [state, onSuccess])

  return { state, openDrawer, closeDrawer, setWarehouse, setQty, reserve, confirm, release }
}
