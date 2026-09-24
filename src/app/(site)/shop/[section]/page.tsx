import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingView } from '@/components/catalogue'
import { BrandSets } from '@/components/catalogue/BrandSets'
import { getLotCounts, getLots, getSectionBySlug, getSubcategories } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'

type Props = {
  params: Promise<{ section: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { section: slug } = await params
  const section = await getSectionBySlug(slug)
  if (!section) return {}
  return listingMetadata(`/shop/${slug}`, await searchParams, {
    title: section.seo?.title || `${section.name} — wholesale lots`,
    description: section.seo?.description || section.intro,
  })
}

export default async function SectionPage({ params, searchParams }: Props) {
  const { section: slug } = await params
  const section = await getSectionBySlug(slug)
  if (!section) notFound()

  const [lots, subs, counts] = await Promise.all([
    getLots({ section: { equals: section.id } }),
    getSubcategories(section.id),
    getLotCounts(),
  ])
  const subCount = new Map<string, number>()
  for (const l of lots) for (const s of l.subcategories) subCount.set(s.slug, (subCount.get(s.slug) ?? 0) + 1)

  return (
    <>
      <ListingView
        lots={lots}
        state={parseListingParams(await searchParams)}
        title={section.name}
        eyebrow={`Section ${String(section.number).padStart(2, '0')}`}
        intro={section.intro}
        breadcrumbs={[
          { label: 'Shop', href: '/shop' },
          { label: section.name, href: `/shop/${section.slug}` },
        ]}
        chips={subs.map((s) => ({ label: s.name, href: `/shop/${section.slug}/${s.slug}`, count: subCount.get(s.slug) ?? 0 }))}
        emptyHref="/shop"
        emptyLabel="See all lots"
      />
      <BrandSets section={section} counts={counts.byBrand} />
    </>
  )
}
