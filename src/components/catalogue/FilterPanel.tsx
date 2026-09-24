'use client'

import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { Button, Drawer } from '@/components/ui'
import { hasFilters, toggleFilter, type Facet, type Filters } from '@/lib/facets'
import { cn } from '@/lib/utils'

import { useListing } from './ListingShell'

const TOP_N = 8

/**
 * Facet sidebar (≥ lg) and full-screen drawer (< lg). Desktop applies on
 * change; mobile edits a draft and applies on "Show results". Each facet is a
 * fieldset/legend group; zero-count options are disabled.
 */
export function FilterPanel({ facets, total }: { facets: Facet[]; total: number }) {
  const { state, navigate } = useListing()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(state.filters)
  const activeCount = Object.values(state.filters).reduce((n, v) => n + (v?.length ?? 0), 0)

  return (
    <>
      <aside id="filters" aria-label="Filters" className="hidden lg:block">
        <h2 className="mb-2 font-display text-xl uppercase">Filter lots</h2>
        <FacetGroups
          facets={facets}
          filters={state.filters}
          onToggle={(key, value) => navigate({ filters: toggleFilter(state.filters, key, value) })}
        />
      </aside>

      <div className="lg:hidden">
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(state.filters)
            setOpen(true)
          }}
          className="border-2 border-ink"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          Filters{activeCount ? ` (${activeCount})` : ''}
        </Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Filter lots"
          side="right"
          size="full"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDraft({})} disabled={!hasFilters(draft)}>
                Clear all
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  navigate({ filters: draft })
                  setOpen(false)
                }}
              >
                Show results
              </Button>
            </div>
          }
        >
          <div className="p-4">
            <p className="mb-3 text-sm text-ink-muted">{total} lots in this view</p>
            <FacetGroups facets={facets} filters={draft} onToggle={(key, value) => setDraft((d) => toggleFilter(d, key, value))} />
          </div>
        </Drawer>
      </div>
    </>
  )
}

function FacetGroups({
  facets,
  filters,
  onToggle,
}: {
  facets: Facet[]
  filters: Filters
  onToggle: (key: Facet['key'], value: string) => void
}) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {facets.map((facet, i) => (
        <FacetGroup key={facet.key} facet={facet} filters={filters} onToggle={onToggle} defaultOpen={i < 4 || !!filters[facet.key]?.length} />
      ))}
    </div>
  )
}

function FacetGroup({
  facet,
  filters,
  onToggle,
  defaultOpen,
}: {
  facet: Facet
  filters: Filters
  onToggle: (key: Facet['key'], value: string) => void
  defaultOpen: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  const selected = useMemo(() => filters[facet.key] ?? [], [filters, facet.key])
  const searchable = facet.key === 'brand' && facet.options.length > TOP_N

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? facet.options.filter((o) => o.label.toLowerCase().includes(q)) : facet.options
    if (showAll || q || list.length <= TOP_N + 2) return list
    // keep selected options visible even when collapsed
    const top = list.slice(0, TOP_N)
    return [...top, ...list.slice(TOP_N).filter((o) => selected.includes(o.value))]
  }, [facet.options, query, showAll, selected])

  // group headings for subcategory (A/B/C) and descriptor groups
  const grouped = facet.key === 'desc' || facet.key === 'design' || facet.key === 'sub'
  const headings = options.map((o, idx) =>
    grouped && o.group && o.group !== options[idx - 1]?.group ? o.group : null,
  )

  return (
    <fieldset className="py-3">
      <legend className="w-full">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-10 w-full items-center justify-between gap-2 text-left font-bold"
        >
          <span>
            {facet.label}
            {selected.length ? <span className="ml-1.5 rounded-pill bg-brand-yellow px-1.5 text-xs">{selected.length}</span> : null}
          </span>
          <ChevronDown aria-hidden className={cn('size-4 transition-transform duration-[var(--dur-base)]', open && 'rotate-180')} />
        </button>
      </legend>
      <div id={id} hidden={!open} className="grid gap-1 pt-1">
        {searchable ? (
          <label className="mb-1 flex items-center gap-2 rounded-md border border-line bg-surface px-2 focus-within:border-ink">
            <Search aria-hidden className="size-4 text-ink-muted" />
            <span className="sr-only">Search brands</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands"
              className="min-h-9 w-full bg-transparent text-sm outline-none"
            />
          </label>
        ) : null}
        <ul className="grid gap-0.5">
          {options.map((o, idx) => {
            const heading = headings[idx]
            const disabled = o.count === 0 && !selected.includes(o.value)
            return (
              <li key={o.value}>
                {heading ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {facet.key === 'sub' && heading.length <= 2 ? `Group ${heading}` : heading}
                  </p>
                ) : null}
                <label
                  className={cn(
                    'flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-1 text-sm hover:bg-line/40',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    disabled={disabled}
                    onChange={() => onToggle(facet.key, o.value)}
                    className="size-4 accent-[var(--brand-blue)]"
                  />
                  <span className="flex-1">{o.label}</span>
                  <span className="text-xs text-ink-muted">{o.count}</span>
                </label>
              </li>
            )
          })}
        </ul>
        {!query && facet.options.length > TOP_N + 2 ? (
          <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-1 w-fit text-sm font-semibold text-accent underline underline-offset-2">
            {showAll ? 'Show fewer' : `Show all ${facet.options.length}`}
          </button>
        ) : null}
      </div>
    </fieldset>
  )
}
