import { CheckCircle2, Clock, FileText, Hourglass, PackageCheck, Receipt, RotateCcw, XCircle } from 'lucide-react'

import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@/lib/rfq'
import { cn } from '@/lib/utils'

const STYLE: Record<QuoteStatus, { icon: typeof Clock; className: string }> = {
  submitted: { icon: Clock, className: 'bg-surface text-ink border-ink' },
  quoted: { icon: FileText, className: 'bg-brand-blue text-white border-ink' },
  revised: { icon: RotateCcw, className: 'bg-brand-yellow text-ink border-ink' },
  accepted: { icon: CheckCircle2, className: 'bg-brand-green text-ink border-ink' },
  invoiced: { icon: Receipt, className: 'bg-brand-yellow text-ink border-ink' },
  dispatched: { icon: PackageCheck, className: 'bg-ink text-bg border-ink' },
  expired: { icon: Hourglass, className: 'bg-line text-ink border-line' },
  closed: { icon: XCircle, className: 'bg-line text-ink-muted border-line' },
}

/** Colour + icon + text for all 8 quote statuses. */
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const s = STYLE[status]
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-pill border-2 px-2.5 py-0.5 text-xs font-bold', s.className)}>
      <Icon aria-hidden className="size-3.5" /> {QUOTE_STATUS_LABELS[status]}
    </span>
  )
}
