export type StockLevel = 'healthy' | 'low' | 'empty'

export function getStockLevel(qty: number): StockLevel {
  if (qty === 0) return 'empty'
  if (qty <= 5) return 'low'
  return 'healthy'
}

interface StockConfig {
  dotClass: string
  textColor: string
  bg: string
  borderColor: string
  label: string
}

const CONFIG: Record<StockLevel, StockConfig> = {
  healthy: {
    dotClass: 'bg-emerald-400',
    textColor: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.2)',
    label: 'In Stock',
  },
  low: {
    dotClass: 'bg-amber-400 pulse-amber',
    textColor: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.2)',
    label: 'Low Stock',
  },
  empty: {
    dotClass: 'bg-red-500',
    textColor: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
    label: 'Out of Stock',
  },
}

interface StockPillProps {
  qty: number
  showCount?: boolean
}

export function StockPill({ qty, showCount = false }: StockPillProps) {
  const level = getStockLevel(qty)
  const cfg = CONFIG[level]

  return (
    <span
      className="stock-pill"
      style={{
        color: cfg.textColor,
        background: cfg.bg,
        borderColor: cfg.borderColor,
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
      {cfg.label}
      {showCount && qty > 0 && (
        <span style={{ opacity: 0.55, fontWeight: 400 }}>({qty})</span>
      )}
    </span>
  )
}
