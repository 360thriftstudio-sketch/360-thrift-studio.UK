import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Crown, Splatter } from '@/components/brand/Graphics'
import { ListingView } from '@/components/catalogue'
import { BrandLogo } from '@/components/patterns'
import { findOne, getLots, getPayloadClient } from '@/lib/catalogue'
import { brandLogoMode } from '@/lib/brand-logos'
import { parseListingParams } from '@/lib/facets'
import { listingMetadata } from '@/lib/listing-meta'
import type { BuyerType, FashionCategory, Media, Section } from '@/payload-types'

type Props = {
  params: Promise<{ brand: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand: slug } = await params
  const brand = await findOne('brands', slug, 0)
  if (!brand) return {}
  return listingMetadata(`/brands/${slug}`, await searchParams, {
    title: brand.seo?.title || `Wholesale pre-owned ${brand.name} lots`,
    description: brand.seo?.description || brand.description || `Graded pre-owned ${brand.name} wholesale lots.`,
  })
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { brand: slug } = await params
  const brand = await findOne('brands', slug, 1)
  if (!brand) notFound()
  const payload = await getPayloadClient()
  const [lots, collections, settings] = await Promise.all([
    getLots({ 'brands.brand': { equals: brand.id } }),
    payload.find({ collection: 'brand-collections', where: { brand: { equals: brand.id } }, sort: 'order', limit: 100, depth: 1 }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])
  const logo = typeof brand.logoSvg === 'object' ? (brand.logoSvg as Media | null) : null
  const mode = brandLogoMode(Boolean(settings.showBrandLogos), { logoApproved: brand.logoApproved, wordmarkOnly: brand.wordmarkOnly, hasLogo: !!logo?.url })
  const styles = (brand.fashionCategories ?? []).filter((f): f is FashionCategory => typeof f === 'object')
  const sections = (brand.sections ?? []).filter((s): s is Section => typeof s === 'object')
  const collCount = new Map<string, number>()
  for (const l of lots) if (l.collection) collCount.set(l.collection.slug, (collCount.get(l.collection.slug) ?? 0) + 1)
  const bestFor = [...new Map(collections.docs.flatMap((c) => (c.bestSuitedFor ?? []).filter((b): b is BuyerType => typeof b === 'object')).map((b) => [b.id, b])).values()]

  const hero = (
    <section className="relative overflow-hidden rounded-lg border-2 border-ink bg-surface p-5 md:p-8">
      <Splatter tone="blue" className="absolute -right-10 -top-10 w-56 opacity-80" />
      <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3">
          <div className="flex h-12 items-center">
            <BrandLogo name={brand.name} mode={mode} logoUrl={logo?.url ?? undefined} className="text-3xl" />
          </div>
          {brand.description ? <p className="max-w-2xl text-ink-muted">{brand.description}</p> : null}
          <div className="flex flex-wrap gap-2 text-sm">
            {styles.map((s) => (
              <Link key={s.id} href={`/styles/${s.slug}`} className="rounded-pill bg-brand-yellow px-3 py-1 font-semibold">{s.name}</Link>
            ))}
            {sections.map((s) => (
              <Link key={s.id} href={`/shop/${s.slug}?brand=${brand.slug}`} className="rounded-pill border border-line bg-bg px-3 py-1 hover:border-ink">{s.name}</Link>
            ))}
          </div>
          {bestFor.length ? (
            <p className="text-sm">
              <span className="font-bold">Best suited for:</span> {bestFor.map((b) => b.name).join(' · ')}
            </p>
          ) : null}
        </div>
        <p className="max-w-xs rounded-md bg-bg p-3 text-xs text-ink-muted">{brand.disclaimer}</p>
      </div>
    </section>
  )

  const collectionTiles = collections.docs.length ? (
    <section aria-labelledby="collections">
      <h2 id="collections" className="mb-3 text-3xl">{brand.name} collections</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {collections.docs.map((c) => (
          <li key={c.id}>
            <Link href={`/brands/${brand.slug}/${c.slug}`} className="group flex h-full flex-col gap-2 rounded-lg border-2 border-ink bg-surface p-4 hover:shadow-[4px_4px_0_0_var(--brand-black)]">
              <span className="flex items-start justify-between gap-2">
                <span className="w-fit rounded-sm bg-ink px-2 py-0.5 text-xs font-bold uppercase text-bg">{c.tier}</span>
                <Crown className="w-7 shrink-0 transition-transform duration-[var(--dur-base)] group-hover:-rotate-12" />
              </span>
              <span className="font-display text-xl uppercase leading-tight">{c.name}</span>
              {c.description ? <span className="line-clamp-3 text-sm text-ink-muted">{c.description}</span> : null}
              <span className="mt-auto text-sm font-bold text-accent">{collCount.get(c.slug) ?? 0} lots →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null

  return (
    <ListingView
      lots={lots}
      state={parseListingParams(await searchParams)}
      title={`${brand.name} lots`}
      eyebrow={brand.kind === 'brand' ? 'Pre-owned wholesale' : 'Stock group'}
      breadcrumbs={[
        { label: 'Brands', href: '/brands' },
        { label: brand.name, href: `/brands/${brand.slug}` },
      ]}
      aside={
        <div className="grid gap-6">
          {hero}
          {collectionTiles}
        </div>
      }
      hide={['brand']}
      emptyHref="/brands"
      emptyLabel="Browse all brands"
    />
  )
}
