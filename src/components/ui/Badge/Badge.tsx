import { AlertTriangle, CheckCircle2, Clock, Sparkles, Star, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type BadgeTone = 'new' | 'low' | 'sold' | 'success' | 'bestseller' | 'arriving' | 'neutral'

const tones: Record<BadgeTone, { className: string; icon?: ReactNode }> = {
  new: { className: 'bg-badge-new text-accent-ink', icon: <Sparkles aria-hidden className="size-3.5" /> },
  low: { className: 'bg-badge-low text-ink', icon: <AlertTriangle aria-hidden className="size-3.5" /> },
  sold: { className: 'bg-badge-sold text-accent-ink', icon: <XCircle aria-hidden className="size-3.5" /> },
  success: { className: 'bg-success text-accent-ink', icon: <CheckCircle2 aria-hidden className="size-3.5" /> },
  bestseller: { className: 'bg-ink text-bg', icon: <Star aria-hidden className="size-3.5" /> },
  arriving: { className: 'bg-surface text-ink border border-line', icon: <Clock aria-hidden className="size-3.5" /> },
  neutral: { className: 'bg-surface text-ink border border-line' },
}

/** Status badge. Always icon + text — never colour alone (WCAG 1.4.1). */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  const t = tones[tone]
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        t.className,
        className,
      )}
    >
      {t.icon}
      {children}
    </span>
  )
}
