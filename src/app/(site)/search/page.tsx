import type { Metadata } from 'next'

import { ListingView } from '@/components/catalogue'
import { getLots } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseListingParams(await searchParams)
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false, follow: true } }
}

/** Search runs over lots, brands, sections, subcategories and styles (Postgres FTS / Meilisearch later). */
export default async function SearchPage({ searchParams }: Props) {
  const state = parseListingParams(await searchParams)
  const lots = await getLots()
  return (
    <ListingView
      lots={lots}
      state={state}
      title={state.q ? `Results for “${state.q}”` : 'Search the catalogue'}
      eyebrow="Search"
      intro={state.q ? null : 'Search by brand, section, model or SKU — e.g. “Nuptse”, “double knee”, “DEMO-012”.'}
      breadcrumbs={[{ label: 'Search', href: '/search' }]}
      aside={
        <form action="/search" role="search" className="flex max-w-xl gap-2">
          <label htmlFor="search-q" className="sr-only">Search lots, brands and sections</label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={state.q}
            placeholder="Nuptse, double knee, Coach…"
            className="min-h-12 flex-1 rounded-md border-2 border-ink bg-surface px-3 text-base outline-none"
          />
          <button type="submit" className="min-h-12 rounded-md border-2 border-ink bg-accent px-5 font-bold text-accent-ink">Search</button>
        </form>
      }
    />
  )
}
