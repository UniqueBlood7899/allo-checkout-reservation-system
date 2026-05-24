# Plan 07-A: Expand ProductAvatar — 10 Category Icon System

**Phase:** 07 — Premium Seed Catalog
**Plan:** A — ProductAvatar icon + gradient expansion
**Depends on:** Phase 4 (existing ProductAvatar component)
**Status:** Ready to execute

---

## Goal

Replace the 3-category `ProductAvatar` with a full 10-category system. Each category
gets a distinct Lucide icon and a unique gradient that visually differentiates product
types on the dashboard.

---

## Category → Icon → Gradient Mapping

| Category | Lucide Icon | Gradient | Detection keywords |
|----------|-------------|----------|--------------------|
| audio | `Headphones` | violet-600 → indigo-500 | headphone, earbud, speaker, microphone, audio, anc, studio, dac, monitor (audio), bone, wireless (audio) |
| electronics | `Cpu` | blue-600 → cyan-500 | webcam, hub, charger, lamp, display, ups, led strip, power strip, purifier, smart display |
| gaming | `Gamepad2` | emerald-600 → teal-500 | gaming, keyboard (gaming), controller, mouse pad, capture card, streaming deck, cooling pad |
| footwear | `Footprints` | cyan-600 → sky-500 | shoe, boot, sneaker, trail, cleat, slide, flat, court |
| wearables | `Watch` | rose-600 → pink-500 | smartwatch, fitness band, smart ring, gps watch, smart glasses, heart rate, sleep tracker, sports watch, health band, smart sunglasses |
| fitness | `Dumbbell` | orange-600 → amber-500 | resistance band, dumbbell, yoga mat, jump rope, pull-up, ab roller, foam roller, kettlebell, gym bag, balance board |
| bags | `Backpack` | indigo-600 → purple-500 | backpack, pack, duffel, tote, sleeve, sling, packing cube, weekender, organizer (bag), waist pack |
| peripherals | `Keyboard` | slate-600 → blue-500 | wireless mouse, slim keyboard, vertical mouse, trackpad, wrist rest, docking station, cable management, monitor arm, laptop stand, kvm |
| home-office | `Monitor` | purple-600 → violet-500 | 4k monitor, standing desk, desk divider, ergonomic chair, light bar, desk organizer, ambient light panel, webcam privacy, speakerphone, under-desk |
| accessories | `Cable` | zinc-600 → slate-500 | phone stand, cable clip, screen protector, cleaning kit, wireless charger, smart tracker, hdmi, usb-c adapter, cable organizer, scratch repair |

---

## Detection Strategy

Use a priority-ordered keyword match on `product.name.toLowerCase()`:

```
1. fitness     — dumbbell, kettlebell, yoga, jump rope, pull-up, ab roller, foam roller, resistance band, balance board, gym bag
2. wearables   — smartwatch, fitness band, smart ring, gps watch, sleep tracker, heart rate, sports watch, health band, smart glasses
3. gaming      — gamepad, controller, gaming mouse, gaming keyboard, mouse pad, capture card, streaming deck, cooling pad, kvm (no — that's peripherals), game
4. audio       — headphone, earbud, speaker, dac, bone conduction, studio monitor, anc
5. footwear    — shoe, boot, sneaker, trail runner, cleat, slide, flat, court shoe
6. peripherals — wireless mouse, keyboard, trackpad, wrist rest, docking, monitor arm, laptop stand, cable management
7. home-office — monitor (27"), standing desk, desk divider, chair, light bar, desk organizer, ambient, speakerphone, under-desk
8. electronics — webcam, hub, charger, lamp, led, power strip, purifier, ups, display
9. bags        — backpack, pack, duffel, tote, sleeve, sling, weekender, waist pack
10. accessories — (catch-all for tracker, cable, adapter, organizer, stand, protector, cleaner)
```

---

## Implementation

### File: `components/ProductAvatar.tsx` (full replacement)

```tsx
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
  audio:       Headphones,
  electronics: Cpu,
  gaming:      Gamepad2,
  footwear:    Footprints,
  wearables:   Watch,
  fitness:     Dumbbell,
  bags:        Backpack,
  peripherals: Keyboard,
  'home-office': Monitor,
  accessories: Cable,
  default:     Package,
}

const GRADIENT_MAP: Record<ProductCategory, string> = {
  audio:         'from-violet-600 to-indigo-500',
  electronics:   'from-blue-600 to-cyan-500',
  gaming:        'from-emerald-600 to-teal-500',
  footwear:      'from-cyan-600 to-sky-500',
  wearables:     'from-rose-600 to-pink-500',
  fitness:       'from-orange-600 to-amber-500',
  bags:          'from-indigo-600 to-purple-500',
  peripherals:   'from-slate-600 to-blue-500',
  'home-office': 'from-purple-600 to-violet-500',
  accessories:   'from-zinc-600 to-slate-500',
  default:       'from-indigo-600 to-indigo-400',
}

export function detectCategory(name: string): ProductCategory {
  const n = name.toLowerCase()

  // Priority-ordered — specific before general
  if (/dumbbell|kettlebell|yoga mat|jump rope|pull-up|ab roller|foam roller|resistance band|balance board/.test(n)) return 'fitness'
  if (/gym bag/.test(n)) return 'fitness'
  if (/smartwatch|fitness band|smart ring|gps watch|sleep tracker|heart rate|sports watch|health band|smart glasses|smart sunglass/.test(n)) return 'wearables'
  if (/gaming|game pad|controller|mouse pad|capture card|streaming deck|cooling pad/.test(n)) return 'gaming'
  if (/headphone|earbud|bone conduction|studio monitor|anc headphone/.test(n)) return 'audio'
  if (/\bspeaker\b(?!phone)/.test(n)) return 'audio'  // speaker but not speakerphone
  if (/\bdac\b|amplifier/.test(n)) return 'audio'
  if (/shoe|boot|sneaker|trail runner|trail run|cleat|slide|court shoe|minimalist flat/.test(n)) return 'footwear'
  if (/wireless mouse|vertical mouse|trackpad|wrist rest|docking station|monitor arm|laptop stand|cable management|kvm switch/.test(n)) return 'peripherals'
  if (/\bkeyboard\b/.test(n) && !/gaming/.test(n)) return 'peripherals'
  if (/\bmonitor\b(?! arm| light)/.test(n) || /standing desk|desk divider|ergonomic chair|light bar|desk organizer|ambient light|speakerphone|under-desk/.test(n)) return 'home-office'
  if (/webcam|usb.c hub|portable charger|desk lamp|led strip|power strip|air purifier|ups\b|smart display/.test(n)) return 'electronics'
  if (/backpack|commuter pack|\bduffel\b|tote|laptop sleeve|\bsling\b|packing cube|weekender|waist pack/.test(n)) return 'bags'
  if (/tech organizer/.test(n)) return 'bags'
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
```

---

## Tasks

1. Replace `components/ProductAvatar.tsx` with above implementation
2. `npx tsc --noEmit` — confirm clean
3. Commit: `git add components/ProductAvatar.tsx && git commit -m "feat(07-A): expand ProductAvatar to 10 category icon system"`

---

## Verification

- [ ] `npx tsc --noEmit` exits 0
- [ ] All 10 categories have distinct Icon + gradient
- [ ] `detectCategory('Nova ANC Headphones')` → `'audio'`
- [ ] `detectCategory('Atlas Trail Runner')` → `'footwear'`
- [ ] `detectCategory('Pulse Smartwatch Pro')` → `'wearables'`
- [ ] `detectCategory('Vertex Mechanical Keyboard')` → `'peripherals'`
- [ ] `detectCategory('Apex 4K Monitor 27"')` → `'home-office'`
- [ ] `detectCategory('Phantom Gaming Mouse')` → `'gaming'`
- [ ] `detectCategory('Storm Adjustable Dumbbells')` → `'fitness'`
