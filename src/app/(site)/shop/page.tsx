import type { Metadata } from 'next'

import { ListingView } from '@/components/catalogue'
import { getLotCounts, getLots, getSections } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata('/shop', await searchParams, {
    title: 'Shop all wholesale lots',
    description: 'Graded pre-owned wholesale lots and bales across 15 sections. Filter by brand, style, grade and size.',
  })
}

export default async function ShopPage({ searchParams }: Props) {
  const [lots, sections, counts] = await Promise.all([getLots(), getSections(), getLotCounts()])
  return (
    <ListingView
      lots={lots}
      state={parseListingParams(await searchParams)}
      title="All lots"
      eyebrow="Rewear · Resell · Repeat"
      intro="Every lot shows pieces, weight and grade. Add lots to your quote basket — no payment needed."
      breadcrumbs={[{ label: 'Shop', href: '/shop' }]}
      chips={sections.map((s) => ({ label: s.name, href: `/shop/${s.slug}`, count: counts.bySection.get(s.slug) ?? 0 }))}
    />
  )
}
