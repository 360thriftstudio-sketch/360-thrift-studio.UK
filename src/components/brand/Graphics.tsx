import type { SVGProps } from 'react'

/**
 * Brand-board graphic elements (crown, arrow, sparkle, splatter, drip, stroke).
 * Original, hand-drawn-style SVGs. Always decorative: aria-hidden, never text.
 */
type P = SVGProps<SVGSVGElement>
const deco = { 'aria-hidden': true, focusable: false } as const

/** Crown — quality finds. */
export function Crown(props: P) {
  return (
    <svg viewBox="0 0 64 44" {...deco} {...props}>
      <path
        d="M6 38 3 10l15 13L32 3l14 20 15-13-3 28Z"
        fill="var(--brand-yellow)"
        stroke="var(--brand-black)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M8 38h48" stroke="var(--brand-black)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

/** Curved arrow — circular fashion. */
export function Arrow(props: P) {
  return (
    <svg viewBox="0 0 96 56" {...deco} {...props}>
      <path
        d="M6 48C18 22 44 12 72 16l-3-9 21 14-19 15 2-10C50 22 30 30 18 50Z"
        fill="var(--brand-yellow)"
        stroke="var(--brand-black)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Four-point sparkle — details matter. */
export function Sparkle({ tone = 'green', ...props }: P & { tone?: 'green' | 'blue' | 'yellow' | 'black' }) {
  return (
    <svg viewBox="0 0 32 32" {...deco} {...props}>
      <path
        d="M16 1c1.6 8 4.4 11.6 15 15-10.6 3.4-13.4 7-15 15-1.6-8-4.4-11.6-15-15C11.6 12.6 14.4 9 16 1Z"
        fill={`var(--brand-${tone})`}
        stroke="var(--brand-black)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Paint splatter — urban energy. */
export function Splatter({ tone = 'yellow', ...props }: P & { tone?: 'green' | 'blue' | 'yellow' | 'black' }) {
  const fill = `var(--brand-${tone})`
  return (
    <svg viewBox="0 0 200 160" {...deco} {...props}>
      <path
        fill={fill}
        d="M98 22c14-6 22 10 34 8s26-10 30 4-10 20-2 32 26 14 18 28-26 4-34 14-2 28-18 30-16-18-30-18-28 14-38 2 6-24-2-34-26-10-22-26 22-12 28-22-4-26 10-30 18 12 26-2Z"
      />
      <circle cx="176" cy="30" r="7" fill={fill} />
      <circle cx="190" cy="54" r="4" fill={fill} />
      <circle cx="22" cy="130" r="8" fill={fill} />
      <circle cx="12" cy="104" r="4" fill={fill} />
      <circle cx="150" cy="146" r="6" fill={fill} />
      <circle cx="40" cy="20" r="5" fill={fill} />
      <circle cx="168" cy="120" r="3" fill={fill} />
    </svg>
  )
}

/** Drip — bold highlight edge. Stretches to the width of its container. */
export function Drip({ tone = 'yellow', ...props }: P & { tone?: 'green' | 'blue' | 'yellow' | 'black' }) {
  return (
    <svg viewBox="0 0 240 40" preserveAspectRatio="none" {...deco} {...props}>
      <path
        fill={`var(--brand-${tone})`}
        d="M0 0h240v10c-6 0-6 8-6 16s-4 12-8 12-6-4-6-12 0-12-6-12-8 4-8 8-2 6-6 6-6-3-6-8-2-6-10-6-10 2-12 12-4 20-10 20-8-6-8-18-4-14-12-14-10 4-10 8-2 8-6 8-6-4-6-8-4-8-14-8-12 6-14 14-4 14-10 14-8-6-8-14-2-14-12-14S30 18 28 22s-4 6-8 6-6-4-6-10-4-8-14-8Z"
      />
    </svg>
  )
}

/** Brush stroke underline — adds movement. */
export function Stroke(props: P) {
  return (
    <svg viewBox="0 0 200 18" preserveAspectRatio="none" {...deco} {...props}>
      <path d="M4 12C60 4 130 3 196 7" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M30 16c46-5 96-6 140-3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Marker-highlighted phrase (yellow fill, black text) — for short headings only. */
export function Highlight({ children, tone = 'yellow' }: { children: React.ReactNode; tone?: 'yellow' | 'green' }) {
  return (
    <span
      className="relative inline-block px-1"
      style={{
        backgroundImage: `linear-gradient(transparent 18%, var(--brand-${tone}) 18%, var(--brand-${tone}) 88%, transparent 88%)`,
        color: 'var(--brand-black)',
      }}
    >
      {children}
    </span>
  )
}
