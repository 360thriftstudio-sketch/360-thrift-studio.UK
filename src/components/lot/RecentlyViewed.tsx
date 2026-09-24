'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/** Recently viewed lots, from this browser only. */
export function RecentlyViewed({ current, titles }: { current: string; titles: Record<string, string> }) {
  const [slugs, setSlugs] = useState<string[]>([])
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('thrift360.recent.v1') ?? '[]') as string[]
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setSlugs(all.filter((s) => s !== current && titles[s]).slice(0, 6))
    } catch {
      // storage unavailable
    }
  }, [current, titles])
  if (!slugs.length) return null
  return (
    <section aria-labelledby="recent" className="grid gap-3">
      <h2 id="recent" className="text-2xl">Recently viewed</h2>
      <ul className="flex flex-wrap gap-2">
        {slugs.map((s) => (
          <li key={s}>
            <Link href={`/lot/${s}`} className="inline-flex min-h-9 items-center rounded-pill border-2 border-ink bg-surface px-3 text-sm font-semibold hover:bg-brand-yellow">
              {titles[s]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
