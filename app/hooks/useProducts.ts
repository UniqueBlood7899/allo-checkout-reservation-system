'use client'

import { useEffect, useState, useCallback } from 'react'

export interface InventoryItem {
  warehouseId: string
  warehouseName: string
  availableQty: number
}

export interface Product {
  id: string
  name: string
  sku: string
  price: string
  inventory: InventoryItem[]
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`)
      const data: Product[] = await res.json()
      setProducts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    // Live stock polling every 30 seconds
    const interval = setInterval(fetchProducts, 30_000)
    return () => clearInterval(interval)
  }, [fetchProducts])

  return { products, loading, error, refresh: fetchProducts }
}
