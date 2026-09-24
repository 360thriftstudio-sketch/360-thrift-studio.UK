import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingView } from '@/components/catalogue'
import { getLots, getSectionBySlug, getSubcategories } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'

type Props = {
  params: Promise<{ section: string; subcategory: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function load(sectionSlug: string, subSlug: string) {
  const section = await getSectionBySlug(sectionSlug)
  if (!section) return null
  const subs = await getSubcategories(section.id)
  const sub = subs.find((s) => s.slug === subSlug)
  return sub ? { section, sub, subs } : null
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const p = await params
  const data = await load(p.section, p.subcategory)
  if (!data) return {}
  return listingMetadata(`/shop/${p.section}/${p.subcategory}`, await searchParams, {
    title: data.sub.seo?.title || `${data.sub.name} — ${data.section.name} wholesale`,
    description: data.sub.seo?.description || data.sub.intro || data.section.intro,
  })
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const p = await params
  const data = await load(p.section, p.subcategory)
  if (!data) notFound()
  const { section, sub, subs } = data
  const lots = await getLots({ subcategory: { in: [sub.id] } })
  const groupLabel = section.subcategoryGroups?.find((g) => g.key === sub.group)?.label

  return (
    <ListingView
      lots={lots}
      state={parseListingParams(await searchParams)}
      title={sub.name}
      eyebrow={groupLabel ? `${section.name} · ${sub.group}. ${groupLabel}` : section.name}
      intro={sub.intro || section.intro}
      breadcrumbs={[
        { label: 'Shop', href: '/shop' },
        { label: section.name, href: `/shop/${section.slug}` },
        { label: sub.name, href: `/shop/${section.slug}/${sub.slug}` },
      ]}
      chips={subs.map((s) => ({ label: s.name, href: `/shop/${section.slug}/${s.slug}`, selected: s.id === sub.id }))}
      hide={['sub']}
      emptyHref={`/shop/${section.slug}`}
      emptyLabel={`See all ${section.name}`}
    />
  )
}
