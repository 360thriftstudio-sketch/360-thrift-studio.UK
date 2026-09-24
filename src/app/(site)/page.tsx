import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { Hero, HowItWorks, SectionTiles, StyleTiles, TrustStrip, type SectionTile } from '@/components/blocks'
import { getSiteNav } from '@/lib/navigation'
import type { Media } from '@/payload-types'

/**
 * Home. Build 1 renders sections and styles from the CMS; Build 5 turns this
 * into a fully block-built page (FeaturedCollections, LotCarousel, Reviews…).
 */
export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })
  const [nav, sections, settings] = await Promise.all([
    getSiteNav(),
    payload.find({ collection: 'sections', sort: 'number', limit: 50, depth: 1 }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])

  const tiles: SectionTile[] = sections.docs.map((s) => {
    const img = typeof s.image === 'object' ? (s.image as Media | null) : null
    return {
      number: s.number,
      name: s.name,
      href: `/shop/${s.slug}`,
      image: img?.url ? { url: img.url, alt: img.alt } : null,
    }
  })

  return (
    <>
      <Hero
        heading="Wholesale vintage, graded and counted"
        subheading="Browse lots and bales across 15 sections and the brands buyers ask for. Add them to a quote basket — no payment needed — and we’ll reply with a trade quote."
      />
      <TrustStrip items={settings.trust ?? []} />
      <SectionTiles sections={tiles} />
      <StyleTiles styles={nav.styles} />
      <HowItWorks />
    </>
  )
}
