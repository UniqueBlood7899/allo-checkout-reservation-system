'use client'

import { motion } from 'framer-motion'
import { Package, Warehouse, TrendingUp, Clock } from 'lucide-react'

interface MetricsStripProps {
  totalProducts: number
  totalWarehouses: number
  totalAvailableItems: number
  activeReservations?: number
}

function MetricCard({
  icon: Icon,
  label,
  value,
  iconBg,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: number
  iconBg: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-3 px-6 py-3.5"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none" style={{ color: '#f8fafc' }}>
          {value.toLocaleString()}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
          {label}
        </p>
      </div>
    </motion.div>
  )
}

export function MetricsStrip({
  totalProducts,
  totalWarehouses,
  totalAvailableItems,
  activeReservations = 0,
}: MetricsStripProps) {
  return (
    <div
      className="border-b overflow-x-auto"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'rgba(17,24,39,0.5)',
      }}
    >
      <div className="max-w-7xl mx-auto px-0">
        <div
          className="flex items-stretch"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {[
            { icon: Package, label: 'Products', value: totalProducts, iconBg: 'bg-indigo-500/20', delay: 0.1 },
            { icon: Warehouse, label: 'Warehouses', value: totalWarehouses, iconBg: 'bg-cyan-500/20', delay: 0.15 },
            { icon: TrendingUp, label: 'Available Units', value: totalAvailableItems, iconBg: 'bg-emerald-500/20', delay: 0.2 },
            { icon: Clock, label: 'Active Locks', value: activeReservations, iconBg: 'bg-amber-500/20', delay: 0.25 },
          ].map((item, i) => (
            <div
              key={item.label}
              className={i < 3 ? 'border-r' : ''}
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <MetricCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
