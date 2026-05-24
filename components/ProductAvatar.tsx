import {
  Headphones,
  Cpu,
  Gamepad2,
  Footprints,
  Watch,
  Dumbbell,
  Backpack,
  Keyboard,
  Monitor,
  Cable,
  Package,
} from 'lucide-react'

export type ProductCategory =
  | 'audio'
  | 'electronics'
  | 'gaming'
  | 'footwear'
  | 'wearables'
  | 'fitness'
  | 'bags'
  | 'peripherals'
  | 'home-office'
  | 'accessories'
  | 'default'

const ICON_MAP: Record<ProductCategory, React.ElementType> = {
  audio:           Headphones,
  electronics:     Cpu,
  gaming:          Gamepad2,
  footwear:        Footprints,
  wearables:       Watch,
  fitness:         Dumbbell,
  bags:            Backpack,
  peripherals:     Keyboard,
  'home-office':   Monitor,
  accessories:     Cable,
  default:         Package,
}

const GRADIENT_MAP: Record<ProductCategory, string> = {
  audio:           'from-violet-600 to-indigo-500',
  electronics:     'from-blue-600 to-cyan-500',
  gaming:          'from-emerald-600 to-teal-500',
  footwear:        'from-cyan-600 to-sky-500',
  wearables:       'from-rose-600 to-pink-500',
  fitness:         'from-orange-600 to-amber-500',
  bags:            'from-indigo-600 to-purple-500',
  peripherals:     'from-slate-600 to-blue-500',
  'home-office':   'from-purple-600 to-violet-500',
  accessories:     'from-zinc-600 to-slate-500',
  default:         'from-indigo-600 to-indigo-400',
}

/**
 * Detect product category from name — priority-ordered, specific before general.
 * Covers all 10 catalog categories from the Phase 7 seed.
 */
export function detectCategory(name: string): ProductCategory {
  const n = name.toLowerCase()

  // ── Fitness first — overlaps with bags (gym bag) ─────────────────────────
  if (/dumbbell|kettlebell|yoga mat|jump rope|pull-up|ab roller|foam roller|resistance band|balance board/.test(n))
    return 'fitness'
  if (/\bgym bag\b/.test(n)) return 'fitness'

  // ── Wearables — before audio (bone conduction is audio, smartwatch is wearable) ──
  if (/smartwatch|fitness band|smart ring|gps watch|sleep tracker|heart rate monitor|sports watch|health band|smart glasses|smart sunglass/.test(n))
    return 'wearables'

  // ── Gaming — before peripherals (gaming keyboard vs slim keyboard) ────────
  if (/\bgaming\b|game pad|controller|mouse pad|capture card|streaming deck|cooling pad/.test(n))
    return 'gaming'

  // ── Audio — specific terms, speaker guard vs speakerphone ────────────────
  if (/headphone|earbud|bone conduction|studio monitor|anc headphone/.test(n))
    return 'audio'
  if (/\bspeaker\b(?!phone)/.test(n)) return 'audio'
  if (/\bdac\b|\bamplifier\b/.test(n)) return 'audio'

  // ── Footwear ──────────────────────────────────────────────────────────────
  if (/\bshoe\b|\bboot\b|sneaker|trail runner|trail run|\bcleat\b|\bslide\b|court shoe|minimalist flat|low-top trainer/.test(n))
    return 'footwear'

  // ── Peripherals — keyboard (non-gaming), mouse (non-gaming), docking ─────
  if (/wireless mouse|vertical mouse|trackpad|wrist rest|docking station|monitor arm|laptop stand|cable management|kvm switch/.test(n))
    return 'peripherals'
  if (/\bkeyboard\b/.test(n) && !/gaming/.test(n)) return 'peripherals'

  // ── Home office — monitor (display product), desk furniture ──────────────
  if (/\bmonitor\b(?! arm| light bar)/.test(n)) return 'home-office'
  if (/standing desk|desk divider|ergonomic chair|monitor light|light bar|desk organizer|ambient light|speakerphone|under-desk|privacy filter/.test(n))
    return 'home-office'

  // ── Electronics — webcam, hub, charger, lamp, LED, purifier ──────────────
  if (/webcam|usb.c hub|portable charger|desk lamp|\bled strip\b|power strip|air purifier|\bups\b|smart display|monitor light/.test(n))
    return 'electronics'

  // ── Bags ──────────────────────────────────────────────────────────────────
  if (/backpack|commuter pack|\bduffel\b|\btote\b|laptop sleeve|\bsling\b|packing cube|weekender|tech organizer|waist pack/.test(n))
    return 'bags'

  // ── Accessories — catch-all for cables, adapters, chargers, stands ───────
  return 'accessories'
}

interface ProductAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProductAvatar({ name, size = 'md' }: ProductAvatarProps) {
  const category = detectCategory(name)
  const Icon = ICON_MAP[category]
  const gradient = GRADIENT_MAP[category]

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
