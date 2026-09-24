import {
  CatalogueCTA,
  FeaturedCollections,
  Hero,
  HowItWorks,
  LotCarousel,
  Newsletter,
  SectionTiles,
  StyleTiles,
  TrustStrip,
  WhyUs,
  type SectionTile,
} from '@/components/blocks'
import { BrandMarquee } from '@/components/patterns'
import { getLotCounts, getPayloadClient, getSections } from '@/lib/catalogue'
import { sortLots } from '@/lib/facets'
import { getSiteNav } from '@/lib/navigation'
import type { Brand, Media } from '@/payload-types'

const FEATURED = [
  'tnf-puffers-premium-iconic-vintage-era',
  'carhartt-detroit-active-chore-jackets',
  'lululemon-align',
  'coach-vintage-heritage-leather',
]

/** Home: every section below is fed by the CMS (sections, brands, collections, lots, settings). */
export default async function HomePage() {
  const payload = await getPayloadClient()
  const [nav, sections, settings, counts, featured] = await Promise.all([
    getSiteNav(),
    getSections(),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
    getLotCounts(),
    payload.find({ collection: 'brand-collections', where: { slug: { in: FEATURED } }, depth: 1, limit: 4 }),
  ])

  const tiles: SectionTile[] = sections.map((s) => {
    const img = typeof s.image === 'object' ? (s.image as Media | null) : null
    return {
      number: s.number,
      name: s.name,
      href: `/shop/${s.slug}`,
      image: img?.url ? { url: img.url, alt: img.alt } : null,
      count: counts.bySection.get(s.slug) ?? 0,
    }
  })
  const featuredItems = FEATURED.map((slug) => featured.docs.find((d) => d.slug === slug))
    .filter((d) => !!d)
    .map((c) => {
      const brand = c.brand as Brand
      return {
        name: c.name,
        href: `/brands/${brand.slug}/${c.slug}`,
        tier: c.tier,
        brand: brand.name,
        description: c.description,
        count: counts.byCollection.get(c.slug) ?? 0,
      }
    })
  const newIn = sortLots(counts.all.filter((l) => l.stock.status !== 'sold'), 'newest').slice(0, 10)

  return (
    <>
      <Hero
        slogan={nav.business.slogan}
        heading="Wholesale vintage, graded & counted"
        subheading="Lots, bales and bags across 15 sections and 120+ brands. Add them to a quote basket — no payment needed — and we reply with a trade quote within 1 working day."
      />
      <TrustStrip items={settings.trust ?? []} />
      <SectionTiles sections={tiles} />
      <BrandMarquee brands={nav.brands.featured} />
      <FeaturedCollections items={featuredItems} />
      <LotCarousel title="New in" eyebrow="Fresh from the warehouse" lots={newIn} href="/shop?sort=newest" />
      <StyleTiles styles={nav.styles} />
      <HowItWorks />
      <WhyUs />
      <CatalogueCTA />
      <Newsletter />
    </>
  )
}
