import { Package, Headphones, Backpack, Footprints } from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  headphones: Headphones,
  shoes: Footprints,
  backpack: Backpack,
}

const GRADIENT_MAP: Record<string, string> = {
  headphones: 'from-violet-600 to-indigo-500',
  shoes: 'from-cyan-600 to-blue-500',
  backpack: 'from-indigo-600 to-purple-500',
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('headphone') || lower.includes('audio') || lower.includes('wireless')) return 'headphones'
  if (lower.includes('shoe') || lower.includes('boot') || lower.includes('sneaker') || lower.includes('running') || lower.includes('trail')) return 'shoes'
  if (lower.includes('bag') || lower.includes('backpack') || lower.includes('pack')) return 'backpack'
  return 'default'
}

interface ProductAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProductAvatar({ name, size = 'md' }: ProductAvatarProps) {
  const category = detectCategory(name)
  const Icon = ICON_MAP[category] ?? Package
  const gradient = GRADIENT_MAP[category] ?? 'from-indigo-600 to-indigo-400'

  const sizes = {
    sm: { outer: 'w-10 h-10', icon: 'w-5 h-5' },
    md: { outer: 'w-14 h-14', icon: 'w-7 h-7' },
    lg: { outer: 'w-20 h-20', icon: 'w-10 h-10' },
  }

  return (
    <div
      className={`${sizes[size].outer} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
    >
      <Icon className={`${sizes[size].icon} text-white`} />
    </div>
  )
}
