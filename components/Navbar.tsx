'use client'

import { motion } from 'framer-motion'
import { Activity, Package, Zap } from 'lucide-react'

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 glass border-b"
      style={{ borderColor: 'rgba(99,102,241,0.15)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-widest" style={{ color: '#f8fafc' }}>
              ALLO
            </span>
            <span className="text-sm font-normal ml-2" style={{ color: '#94a3b8' }}>
              Inventory Operations
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{ color: '#94a3b8' }}>Live</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
            <Activity className="w-3.5 h-3.5" />
            <span>Real-time stock</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
            <Package className="w-3.5 h-3.5" />
            <span>10-min locks</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
