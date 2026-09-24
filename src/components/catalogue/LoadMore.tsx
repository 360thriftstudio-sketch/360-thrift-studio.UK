'use client'

import { Button } from '@/components/ui'

import { useListing } from './ListingShell'

/** "Show 24 more" + progress. Keeps ?page= in the URL for sharing and SEO. */
export function LoadMore({ shown, total, pageSize }: { shown: number; total: number; pageSize: number }) {
  const { state, navigate, pending } = useListing()
  if (total === 0) return null
  const pct = Math.round((shown / total) * 100)
  return (
    <div className="grid justify-items-center gap-3 py-8">
      <p className="text-sm font-semibold">
        {shown} of {total} lots
      </p>
      <div className="h-2 w-60 overflow-hidden rounded-pill bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={shown} aria-label="Lots shown">
        <div className="h-full bg-brand-blue" style={{ width: `${pct}%` }} />
      </div>
      {shown < total ? (
        <Button variant="secondary" className="border-2 border-ink" loading={pending} onClick={() => navigate({ ...state, page: state.page + 1 })}>
          Show {Math.min(pageSize, total - shown)} more
        </Button>
      ) : null}
    </div>
  )
}
