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
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl animate-pulse"
      style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(99,102,241,0.1)' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl" style={{ background: '#1a2235' }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-2/3 rounded" style={{ background: '#1a2235' }} />
          <div className="h-3 w-1/3 rounded" style={{ background: '#1a2235' }} />
          <div className="h-5 w-20 rounded-full mt-1" style={{ background: '#1a2235' }} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/4 rounded" style={{ background: '#1a2235' }} />
        <div className="h-11 rounded-xl" style={{ background: '#1a2235' }} />
        <div className="h-11 rounded-xl" style={{ background: '#1a2235' }} />
      </div>
      <div className="flex justify-end">
        <div className="h-9 w-24 rounded-xl" style={{ background: '#1a2235' }} />
      </div>
    </div>
  )
}

export function ProductGrid({
  products,
  loading,
  error,
  onReserve,
  onRetry,
  reservingProductId,
  reservedProductIds,
}: ProductGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10" style={{ color: '#ef4444' }} />
        <p style={{ color: '#94a3b8' }}>{error}</p>
        <button onClick={onRetry} className="btn-reserve flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
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

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-lg font-semibold" style={{ color: '#94a3b8' }}>No products found</p>
        <p className="text-sm" style={{ color: '#475569' }}>Inventory data unavailable</p>
      </div>
    )
  }

  return (
    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
