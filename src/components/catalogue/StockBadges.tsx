import type { ReactNode } from 'react'

import { Badge } from '@/components/ui'
import type { LotSummary } from '@/lib/facets'

/** Honest stock + merchandising badges (icon + text, never colour alone). */
export function StockBadges({ lot, max = 3 }: { lot: LotSummary; max?: number }) {
  const out: ReactNode[] = []
  if (lot.stock.status === 'sold') out.push(<Badge key="sold" tone="sold">Sold</Badge>)
  else if (lot.stock.status === 'low')
    out.push(
      <Badge key="low" tone="low">
        {lot.stock.lotsAvailable > 0 ? `Only ${lot.stock.lotsAvailable} left` : 'Low stock'}
      </Badge>,
    )
  else if (lot.stock.status === 'arriving') out.push(<Badge key="arr" tone="arriving">Arriving</Badge>)
  if (lot.badges.includes('new')) out.push(<Badge key="new" tone="new">New</Badge>)
  if (lot.badges.includes('best-seller')) out.push(<Badge key="bs" tone="bestseller">Best seller</Badge>)
  if (lot.badges.includes('verified-era')) out.push(<Badge key="era" tone="success">Verified era</Badge>)
  return <div className="flex flex-wrap gap-1">{out.slice(0, max)}</div>
}
