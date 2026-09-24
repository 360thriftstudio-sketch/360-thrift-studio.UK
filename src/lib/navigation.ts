import 'server-only'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { brandLogoMode } from '@/lib/brand-logos'
import type { NavLink, SiteNav } from '@/lib/nav-types'
import type { Media } from '@/payload-types'

export type { NavBrand, NavLink, SiteNav } from './nav-types'

const TRADE_LINKS: NavLink[] = [
  { label: 'How to buy', href: '/how-to-buy' },
  { label: 'Open a trade account', href: '/trade-account' },
  { label: 'Warehouse visit', href: '/warehouse-visit' },
  { label: 'Grading guide', href: '/grading' },
  { label: 'Shipping', href: '/shipping' },
]

/** Menu data from the CMS. Cached per request. */
export const getSiteNav = cache(async (): Promise<SiteNav> => {
  const payload = await getPayload({ config: configPromise })

  const [sections, brands, styles, settings] = await Promise.all([
    payload.find({ collection: 'sections', sort: 'number', limit: 50, depth: 0 }),
    payload.find({
      collection: 'brands',
      where: { featured: { equals: true } },
      sort: 'name',
      limit: 16,
      depth: 1,
    }),
    payload.find({ collection: 'fashion-categories', sort: 'order', limit: 20, depth: 0 }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])

  const toSectionLink = (s: (typeof sections.docs)[number]): NavLink => ({
    label: s.name,
    href: `/shop/${s.slug}`,
  })

  const showLogos = Boolean(settings.showBrandLogos)

  return {
    shop: {
      column1: sections.docs.filter((s) => s.menuColumn !== '2').map(toSectionLink),
      column2: sections.docs.filter((s) => s.menuColumn === '2').map(toSectionLink),
      quick: [
        { label: 'New in', href: '/shop?sort=newest' },
        { label: 'Best sellers', href: '/shop?sort=best-sellers' },
        { label: 'Bales by kg', href: '/shop?lotType=bale-kg' },
      ],
    },
    brands: {
      featured: brands.docs.map((b) => {
        const logo = typeof b.logoSvg === 'object' ? (b.logoSvg as Media | null) : null
        const mode = brandLogoMode(showLogos, {
          logoApproved: b.logoApproved,
          wordmarkOnly: b.wordmarkOnly,
          hasLogo: Boolean(logo?.url),
        })
        return {
          label: b.name,
          href: `/brands/${b.slug}`,
          mode,
          logoUrl: mode === 'logo' ? (logo?.url ?? undefined) : undefined,
        }
      }),
      more: [
        { label: 'All brands A–Z', href: '/brands' },
        { label: 'Luxury on request', href: '/luxury-requests' },
      ],
    },
    styles: styles.docs.map((s) => ({ label: s.name, href: `/styles/${s.slug}` })),
    catalogue: { label: 'Catalogue', href: '/catalogue' },
    trade: TRADE_LINKS,
    announcement:
      settings.announcement?.enabled && settings.announcement.text
        ? { text: settings.announcement.text, href: settings.announcement.link ?? undefined }
        : null,
    contact: {
      email: settings.contact?.email,
      phone: settings.contact?.phone,
      whatsapp: settings.contact?.whatsapp,
    },
  }
})
