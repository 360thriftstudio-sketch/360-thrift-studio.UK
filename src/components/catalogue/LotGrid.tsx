import type { LotSummary } from '@/lib/facets'
import { cn } from '@/lib/utils'

import { LotCard } from './LotCard'

/** ul > li > article. 2 col < 768, 3 col ≥ 768, 4 col ≥ 1280. */
export function LotGrid({ lots, className, dense }: { lots: LotSummary[]; className?: string; dense?: boolean }) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4',
        dense ? 'xl:grid-cols-4' : 'xl:grid-cols-4 2xl:grid-cols-4',
        className,
      )}
    >
      {lots.map((lot, i) => (
        <li key={lot.id}>
          <LotCard lot={lot} priority={i < 4} />
        </li>
      ))}
    </ul>
  )
}
