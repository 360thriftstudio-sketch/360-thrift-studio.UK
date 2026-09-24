import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingView } from '@/components/catalogue'
import { findOne, getLots } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'
import type { Brand, BuyerType } from '@/payload-types'

type Props = {
  params: Promise<{ brand: string; collection: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function load(brandSlug: string, collSlug: string) {
  const coll = await findOne('brand-collections', collSlug, 1)
  const brand = coll && typeof coll.brand === 'object' ? (coll.brand as Brand) : null
  return coll && brand && brand.slug === brandSlug ? { coll, brand } : null
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const p = await params
  const data = await load(p.brand, p.collection)
  if (!data) return {}
  return listingMetadata(`/brands/${p.brand}/${p.collection}`, await searchParams, {
    title: data.coll.seo?.title || `${data.coll.name} — wholesale`,
    description: data.coll.description,
  })
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const p = await params
  const data = await load(p.brand, p.collection)
  if (!data) notFound()
  const { coll, brand } = data
  const lots = await getLots({ brandCollection: { equals: coll.id } })
  const bestFor = (coll.bestSuitedFor ?? []).filter((b): b is BuyerType => typeof b === 'object')
  return (
    <ListingView
      lots={lots}
      state={parseListingParams(await searchParams)}
      title={coll.name}
      eyebrow={coll.tier ?? brand.name}
      intro={coll.description}
      breadcrumbs={[
        { label: 'Brands', href: '/brands' },
        { label: brand.name, href: `/brands/${brand.slug}` },
        { label: coll.name, href: `/brands/${brand.slug}/${coll.slug}` },
      ]}
      aside={
        <div className="grid gap-2">
          {bestFor.length ? (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Best suited for">
              <li className="text-sm font-bold">Best suited for:</li>
              {bestFor.map((b) => (
                <li key={b.id} className="rounded-pill bg-brand-green px-3 py-1 text-sm font-semibold text-ink">{b.name}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-ink-muted">{brand.disclaimer}</p>
        </div>
      }
      hide={['brand', 'collection']}
      emptyHref={`/brands/${brand.slug}`}
      emptyLabel={`See all ${brand.name} lots`}
    />
  )
}
