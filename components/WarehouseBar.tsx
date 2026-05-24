import { MapPin } from 'lucide-react'
import { StockPill } from './StockPill'

interface WarehouseBarProps {
  name: string
  availableQty: number
  maxQty?: number
}

export function WarehouseBar({ name, availableQty, maxQty = 100 }: WarehouseBarProps) {
  const pct = Math.min(100, (availableQty / Math.max(maxQty, 1)) * 100)

  const barColor =
    availableQty === 0 ? '#ef4444' :
    availableQty <= 5  ? '#f59e0b' :
                         '#10b981'

  return (
    <div
      className="flex flex-col gap-1.5 py-2.5 px-3 rounded-xl"
      style={{
        background: 'rgba(26,34,53,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#475569' }} />
          <span
            className="text-xs font-medium truncate"
            style={{ color: '#94a3b8', maxWidth: '110px' }}
          >
            {name}
          </span>
        </div>
        <StockPill qty={availableQty} showCount />
      </div>

      {/* Stock fill bar */}
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
