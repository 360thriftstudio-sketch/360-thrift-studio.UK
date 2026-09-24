import type { Metadata, Viewport } from 'next'
import { Archivo, Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { AnnouncementBar, Footer, Header, SkipLinks } from '@/components/patterns'
import { getSiteNav } from '@/lib/navigation'

import './globals.css'

// Self-hosted at build time by next/font (subset, font-display: swap).
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  axes: ['wdth'],
  preload: true,
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false })

const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '360 Thrift Studio — wholesale vintage & pre-owned lots',
    template: '%s — 360 Thrift Studio',
  },
  description:
    'B2B wholesale catalogue of graded pre-owned clothing lots and bales. Build a quote basket and request a trade quote.',
}

export const viewport: Viewport = { themeColor: '#fafaf7' }

// Menu and settings come from the CMS; revalidated on publish in Build 2.
export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const nav = await getSiteNav()
  return (
    <html lang="en-GB" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <SkipLinks />
        {nav.announcement ? <AnnouncementBar {...nav.announcement} /> : null}
        <Header nav={nav} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer nav={nav} />
      </body>
    </html>
  )
}
