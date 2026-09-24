'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/** Lots saved with the heart button (this browser). */
export function SavedLots() {
  const [lots, setLots] = useState<{ slug: string; title: string }[] | null>(null)
  useEffect(() => {
    let slugs: string[] = []
    try {
      slugs = JSON.parse(localStorage.getItem('thrift360.saved.v1') ?? '[]') as string[]
    } catch {
      slugs = []
    }
    if (!slugs.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setLots([])
      return
    }
    const qs = new URLSearchParams({ 'where[slug][in]': slugs.join(','), depth: '0', limit: '50', select: 'slug,title' } as Record<string, string>)
    fetch(`/api/lots?${qs}`)
      .then((r) => r.json())
      .then((b: { docs?: { slug: string; title: string }[] }) => setLots(b.docs ?? []))
      .catch(() => setLots([]))
  }, [])
  if (lots === null) return <div className="skeleton h-16 rounded-md" aria-hidden />
  if (!lots.length) return <p className="text-sm text-ink-muted">No saved lots yet. Tap “Save” on any lot to keep it here.</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {lots.map((l) => (
        <li key={l.slug}>
          <Link href={`/lot/${l.slug}`} className="inline-flex min-h-9 items-center rounded-pill border-2 border-ink bg-surface px-3 text-sm font-semibold hover:bg-brand-yellow">
            {l.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
