'use client'

import { motion, type Variants } from 'framer-motion'
import { DollarSign, ChevronRight } from 'lucide-react'
import { ProductAvatar } from './ProductAvatar'
import { WarehouseBar } from './WarehouseBar'
import { StockPill, getStockLevel } from './StockPill'
import type { Product } from '@/app/hooks/useProducts'

interface ProductCardProps {
  product: Product
  onReserve: (product: Product, warehouseId: string) => void
  index: number
  isReserving?: boolean
  optimisticReserved?: boolean
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.4, ease: 'easeOut' as const },
  }),
}

export function ProductCard({
  product,
  onReserve,
  index,
  isReserving = false,
  optimisticReserved = false,
}: ProductCardProps) {
  const totalAvailable = product.inventory.reduce((s, i) => s + i.availableQty, 0)
  const hasStock = totalAvailable > 0

  // Best warehouse to default to: first with stock
  const defaultWarehouse =
    product.inventory.find((i) => i.availableQty > 0) ?? product.inventory[0]

  // Scale warehouse bars relative to the max across all warehouses
  const maxQty = Math.max(...product.inventory.map((i) => i.availableQty), 1)

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative flex flex-col gap-4 p-5 rounded-2xl glass glass-hover glow-indigo"
      style={
        optimisticReserved
          ? { borderColor: 'rgba(16,185,129,0.35)', boxShadow: '0 0 24px rgba(16,185,129,0.1), 0 4px 20px rgba(0,0,0,0.35)' }
          : undefined
      }
    >
      {/* Reserved badge */}
      {optimisticReserved && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981',
          }}
        >
          ✓ Locked
        </motion.div>
      )}

      {/* Header: Avatar + Title + SKU + Price + Stock */}
      <div className="flex items-start gap-4">
        <ProductAvatar name={product.name} size="md" />
        <div className="flex-1 min-w-0">
          <h3
            className="text-[15px] font-bold leading-snug"
            style={{ color: '#f8fafc' }}
          >
            {product.name}
          </h3>
          <p
            className="text-xs mt-0.5 font-mono tracking-wide"
            style={{ color: '#475569' }}
          >
            {product.sku}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#a5b4fc',
              }}
            >
              <DollarSign className="w-3 h-3" />
              {parseFloat(product.price).toFixed(2)}
            </span>
            <StockPill qty={totalAvailable} />
          </div>
        </div>
      </div>

      {/* Warehouse distribution */}
      <div className="flex flex-col gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Warehouse Distribution
        </p>
        {product.inventory.map((inv) => (
          <WarehouseBar
            key={inv.warehouseId}
            name={inv.warehouseName}
            availableQty={inv.availableQty}
            maxQty={maxQty}
          />
        ))}
      </div>

      {/* Reserve CTA */}
      <div className="flex items-center justify-end mt-auto pt-1">
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!hasStock || isReserving || optimisticReserved}
          onClick={() => defaultWarehouse && onReserve(product, defaultWarehouse.warehouseId)}
          className="btn-reserve flex items-center gap-2"
        >
          {isReserving ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                className="inline-block w-3.5 h-3.5 border-2 rounded-full"
                style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
              />
              Locking inventory...
            </>
          ) : optimisticReserved ? (
            '✓ Locked'
          ) : !hasStock ? (
            'Out of Stock'
          ) : (
            <>
              Reserve
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
