import type { Metadata, Viewport } from 'next'
import { Anton, Montserrat, Permanent_Marker } from 'next/font/google'
import type { ReactNode } from 'react'

import { AnnouncementBar, Footer, Header, SkipLinks } from '@/components/patterns'
import { QuoteBasketDrawer } from '@/components/quote/QuoteBasketDrawer'
import { ViewerProvider } from '@/components/quote/ViewerContext'
import { getSiteNav } from '@/lib/navigation'
import { jsonLdString } from '@/lib/seo'
import { getViewer } from '@/lib/viewer'

import './globals.css'

// Self-hosted at build time by next/font (subset, font-display: swap).
// Brand board: condensed bold for headings/tagline, Montserrat for body, marker for accents.
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap', preload: true })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' })
const marker = Permanent_Marker({ weight: '400', subsets: ['latin'], variable: '--font-marker-hand', display: 'swap', preload: false })

const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const isPreview = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Preview deployments must never be indexed.
  robots: isPreview ? { index: false, follow: false } : undefined,
  title: {
    default: '360° Thrift Studio — Vintage · Premium · Wholesale',
    template: '%s — 360° Thrift Studio',
  },
  description:
    'B2B wholesale catalogue of graded pre-owned clothing and bags. 15 sections, 120+ brands. Build a quote basket and request a trade quote — no payment needed.',
  openGraph: { siteName: '360° Thrift Studio', images: ['/brand/studio-logo-circle.webp'] },
}

export const viewport: Viewport = { themeColor: '#fffdf5' }

// Menu, settings and prices depend on the CMS and the logged-in buyer.
export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [nav, viewer] = await Promise.all([getSiteNav(), getViewer()])
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: nav.business.name,
    slogan: nav.business.slogan,
    url: siteUrl,
    logo: `${siteUrl}/brand/studio-logo-circle.webp`,
    address: nav.business.locations.map((c) => ({ '@type': 'PostalAddress', addressCountry: c })),
  }
  return (
    <html lang="en-GB" className={`${anton.variable} ${montserrat.variable} ${marker.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <ViewerProvider
          viewer={{
            loggedIn: viewer.loggedIn,
            tradeApproved: viewer.tradeApproved,
            requireLoginForPrices: nav.requireLoginForPrices,
            name: viewer.customer?.contactName ?? null,
          }}
        >
          <SkipLinks />
          {isPreview ? (
            <p className="bg-brand-blue px-4 py-1.5 text-center text-xs font-semibold text-white">
              Preview site — DEMO lots and placeholder prices. Not open for orders yet.
            </p>
          ) : null}
          {nav.announcement ? <AnnouncementBar {...nav.announcement} /> : null}
          <Header nav={nav} loggedIn={viewer.loggedIn} />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer nav={nav} />
          <QuoteBasketDrawer />
        </ViewerProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(org) }} />
      </body>
    </html>
  )
}
