# Plan 04-A: Dependencies, shadcn Init & Design System

**Phase:** 04 — Product Listing UI
**Plan:** A — Foundation
**Status:** Ready to execute

---

## Goal

1. Install `framer-motion` and initialise `shadcn/ui`
2. Override `app/globals.css` with the full dark design system (CSS variables, `@theme`, base styles)
3. Update `app/layout.tsx` with Inter + JetBrains Mono fonts, dark base class, correct metadata

---

## Tasks

### Task 1 — Install Framer Motion

```bash
npm install framer-motion
```

Verify: `node_modules/framer-motion/package.json` exists.

### Task 2 — Initialise shadcn/ui

```bash
npx shadcn@latest init --defaults
```

If interactive, answer:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- `globals.css` path: `app/globals.css`
- `components.json` already exists: overwrite

After init, add required primitives:
```bash
npx shadcn@latest add button badge drawer select
```

### Task 3 — Overwrite `app/globals.css` with dark design system

Replace entire contents with:

```css
@import "tailwindcss";

/* ─── Font imports (next/font handles this, but @font-face fallback for CSS) ─── */

/* ─── Tailwind v4 theme tokens ─────────────────────────────────────────────── */
@theme inline {
  /* Brand palette */
  --color-base:           #0B1020;
  --color-surface:        #111827;
  --color-surface-raised: #1a2235;
  --color-surface-hover:  #1f2a40;

  /* Border glow */
  --color-border:         rgba(99, 102, 241, 0.15);
  --color-border-active:  rgba(99, 102, 241, 0.45);
  --color-border-subtle:  rgba(255, 255, 255, 0.06);

  /* Accent */
  --color-accent-indigo:  #6366f1;
  --color-accent-cyan:    #22d3ee;
  --color-accent-violet:  #8b5cf6;

  /* Text */
  --color-text-primary:   #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted:     #475569;

  /* Stock indicators */
  --color-stock-healthy:  #10b981;
  --color-stock-low:      #f59e0b;
  --color-stock-empty:    #ef4444;

  /* Countdown */
  --color-timer-safe:     #22d3ee;
  --color-timer-warn:     #f59e0b;
  --color-timer-urgent:   #ef4444;

  /* shadcn/ui CSS variable overrides — dark theme */
  --background: 222 47% 6%;
  --foreground: 213 31% 97%;
  --card: 222 47% 8%;
  --card-foreground: 213 31% 97%;
  --popover: 222 47% 8%;
  --popover-foreground: 213 31% 97%;
  --primary: 239 84% 67%;
  --primary-foreground: 0 0% 100%;
  --secondary: 222 40% 14%;
  --secondary-foreground: 213 31% 97%;
  --muted: 222 40% 12%;
  --muted-foreground: 215 16% 57%;
  --accent: 222 40% 14%;
  --accent-foreground: 213 31% 97%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 239 84% 67%;
  --input: 222 47% 12%;
  --ring: 239 84% 67%;
  --radius: 0.75rem;
}

/* ─── Base styles ───────────────────────────────────────────────────────────── */
@layer base {
  * {
    border-color: var(--color-border);
  }

  html {
    background-color: var(--color-base);
    color: var(--color-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: var(--color-base);
    color: var(--color-text-primary);
    min-height: 100vh;
  }
}

/* ─── Utility classes ───────────────────────────────────────────────────────── */
@layer utilities {
  /* Glassmorphism surface */
  .glass {
    background: rgba(17, 24, 39, 0.80);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--color-border);
  }

  .glass-hover:hover {
    border-color: var(--color-border-active);
    background: rgba(26, 34, 53, 0.90);
  }

  /* Glow shadow utilities */
  .glow-indigo {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.15), 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  .glow-indigo-strong {
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .glow-emerald {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
  }

  /* Gradient text */
  .gradient-text {
    background: linear-gradient(135deg, #6366f1, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Stock pill base */
  .stock-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.025em;
  }

  /* Indigo gradient button */
  .btn-reserve {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.5rem 1.25rem;
    transition: box-shadow 0.2s, filter 0.2s;
  }

  .btn-reserve:hover:not(:disabled) {
    box-shadow: 0 0 24px rgba(99, 102, 241, 0.5);
    filter: brightness(1.1);
  }

  .btn-reserve:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Monospace timer */
  .font-mono-timer {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
}

/* ─── Scrollbar styling ─────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-surface); }
::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }

/* ─── Pulse animation for low stock dot ────────────────────────────────────── */
@keyframes pulse-amber {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.pulse-amber { animation: pulse-amber 1.5s ease-in-out infinite; }

/* ─── Urgency pulse for countdown ──────────────────────────────────────────── */
@keyframes pulse-red {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.02); }
}
.pulse-red { animation: pulse-red 0.8s ease-in-out infinite; }
```

### Task 4 — Update `app/layout.tsx`

Replace with:

```tsx
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Allo Inventory — Reserve Operations',
  description: 'Real-time inventory reservation and stock management system',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  )
}
```

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add -A
git commit -m "feat(04-A): install framer-motion, init shadcn, dark design system"
```

---

## Verification

- [ ] `node_modules/framer-motion` exists
- [ ] `components.json` exists (shadcn init)
- [ ] `components/ui/button.tsx` exists
- [ ] `app/globals.css` has `@theme inline` block with `--color-base: #0B1020`
- [ ] `app/layout.tsx` uses Inter + JetBrains Mono fonts
- [ ] `npx tsc --noEmit` exits 0
- [ ] Dev server still starts without errors
