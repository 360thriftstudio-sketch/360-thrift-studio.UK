'use client'
import type { ReactNode } from 'react'

import { X } from 'lucide-react'

import { FACET_LABELS, SORT_OPTIONS, hasFilters, toggleFilter, type Facet, type FacetKey, type SortValue } from '@/lib/facets'

import { useListing } from './ListingShell'

/** Result count (live region), active filter pills with Clear all, and sort. */
export function ListingToolbar({ facets, total, filterButton }: { facets: Facet[]; total: number; filterButton?: ReactNode }) {
  const { state, navigate } = useListing()
  // Pills follow the optimistic state so they appear the moment a filter is ticked.
  const pills = (Object.entries(state.filters) as [FacetKey, string[]][]).flatMap(([key, values]) =>
    values.map((value) => {
      const facet = facets.find((f) => f.key === key)
      const label = facet?.options.find((o) => o.value === value)?.label ?? value
      return { key, value, label: `${facet?.label ?? FACET_LABELS[key]}: ${label}` }
    }),
  )

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {filterButton}
          <p aria-live="polite" className="text-sm font-semibold">
            {total} {total === 1 ? 'lot' : 'lots'} found
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Sort</span>
          <select
            value={state.sort}
            onChange={(e) => navigate({ sort: e.target.value as SortValue })}
            className="min-h-10 rounded-md border-2 border-ink bg-surface px-2 font-semibold"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pills.length || state.q ? (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {state.q ? (
            <li>
              <button
                type="button"
                onClick={() => navigate({ q: '' })}
                className="inline-flex min-h-8 items-center gap-1 rounded-pill border-2 border-ink bg-brand-yellow px-3 text-sm font-semibold"
              >
                Search: “{state.q}” <X aria-hidden className="size-3.5" />
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ) : null}
          {pills.map((p) => (
            <li key={`${p.key}:${p.value}`}>
              <button
                type="button"
                onClick={() => navigate({ filters: toggleFilter(state.filters, p.key, p.value) })}
                className="inline-flex min-h-8 items-center gap-1 rounded-pill border-2 border-ink bg-brand-yellow px-3 text-sm font-semibold"
              >
                {p.label} <X aria-hidden className="size-3.5" />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
          {hasFilters(state.filters) ? (
            <li>
              <button type="button" onClick={() => navigate({ filters: {} })} className="text-sm font-semibold text-accent underline underline-offset-2">
                Clear all
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
