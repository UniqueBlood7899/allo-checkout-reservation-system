'use client'

import { useCallback, useMemo } from 'react'
import { Navbar } from '@/components/Navbar'
import { MetricsStrip } from '@/components/MetricsStrip'
import { ProductGrid } from '@/components/ProductGrid'
import { ReservationDrawer } from '@/components/ReservationDrawer'
import { useProducts } from '@/app/hooks/useProducts'
import { useReservation } from '@/app/hooks/useReservation'
import type { Product } from '@/app/hooks/useProducts'

export default function HomePage() {
  const { products, loading, error, refresh } = useProducts()
  const {
    state,
    openDrawer,
    closeDrawer,
    setWarehouse,
    setQty,
    reserve,
    release,
  } = useReservation(refresh)

  const handleReserve = useCallback(
    (product: Product, warehouseId: string) => {
      openDrawer(product, warehouseId)
    },
    [openDrawer]
  )

  const handleExpired = useCallback(() => {
    refresh()
  }, [refresh])

  // Compute live metrics
  const { totalAvailable, totalWarehouses } = useMemo(() => {
    const warehouseIds = new Set(
      products.flatMap((p) => p.inventory.map((i) => i.warehouseId))
    )
    const available = products.reduce(
      (sum, p) => sum + p.inventory.reduce((s, i) => s + i.availableQty, 0),
      0
    )
    return { totalAvailable: available, totalWarehouses: warehouseIds.size }
  }, [products])

  // Optimistic UI state
  const reservingProductId =
    state.phase === 'reserving' ? (state.product?.id ?? null) : null
  const reservedProductIds = useMemo(
    () =>
      new Set(
        state.phase === 'active' && state.product ? [state.product.id] : []
      ),
    [state.phase, state.product]
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B1020' }}>
      <Navbar />

      <MetricsStrip
        totalProducts={products.length}
        totalWarehouses={totalWarehouses}
        totalAvailableItems={totalAvailable}
        activeReservations={state.phase === 'active' ? 1 : 0}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Section header */}
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f8fafc' }}>
              Available Inventory
            </h1>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              Reserve a product to lock inventory for 10 minutes
            </p>
          </div>
          {!loading && !error && products.length > 0 && (
            <span className="text-xs flex-shrink-0 hidden sm:block" style={{ color: '#475569' }}>
              {products.length} product{products.length !== 1 ? 's' : ''} · refreshes every 30s
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
        onRelease={release}
        onExpired={handleExpired}
      />
    </div>
  )
}
