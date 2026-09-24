import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingView } from '@/components/catalogue'
import { findOne, getLots } from '@/lib/catalogue'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'

type Props = {
  params: Promise<{ style: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { style: slug } = await params
  const style = await findOne('fashion-categories', slug, 0)
  if (!style) return {}
  return listingMetadata(`/styles/${slug}`, await searchParams, {
    title: `${style.name} wholesale lots`,
    description: style.description,
  })
}

export default async function StylePage({ params, searchParams }: Props) {
  const { style: slug } = await params
  const style = await findOne('fashion-categories', slug, 0)
  if (!style) notFound()
  const lots = await getLots({ fashionCategories: { in: [style.id] } })
  return (
    <ListingView
      lots={lots}
      state={parseListingParams(await searchParams)}
      title={style.name}
      eyebrow="Shop by style"
      intro={style.description}
      breadcrumbs={[
        { label: 'Styles', href: '/styles' },
        { label: style.name, href: `/styles/${style.slug}` },
      ]}
      hide={['style']}
      emptyHref="/styles"
      emptyLabel="See all styles"
    />
  )
}
