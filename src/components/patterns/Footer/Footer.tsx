import Image from 'next/image'
import Link from 'next/link'

import { Crown, Drip, Sparkle, Splatter } from '@/components/brand/Graphics'
import { BRAND_DISCLAIMER } from '@/lib/brand-logos'
import type { NavLink, SiteNav } from '@/lib/nav-types'

const LEGAL: NavLink[] = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Cookies', href: '/legal/cookies' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Disclaimer', href: '/legal/disclaimer' },
  { label: 'Accessibility', href: '/legal/accessibility' },
]

const HELP: NavLink[] = [
  { label: 'About us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
  { label: 'Luxury requests', href: '/luxury-requests' },
  { label: 'Your account', href: '/account' },
]

function Column({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-brand-yellow">{title}</h2>
      <ul className="grid gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-8 items-center hover:text-brand-yellow hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer({ nav }: { nav: SiteNav }) {
  const year = new Date().getFullYear()
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-bg">
      <Drip tone="yellow" className="absolute inset-x-0 top-0 h-8 w-full" />
      <Splatter tone="blue" className="pointer-events-none absolute -right-16 top-24 w-72 opacity-25" />
      <Splatter tone="green" className="pointer-events-none absolute -left-20 bottom-10 w-64 opacity-20" />
      <div className="container-site relative grid gap-10 pb-16 pt-20 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          {/* Build 4: footer sign-off animation (dotLottie) plays once when scrolled into view. */}
          <Image
            src="/brand/studio-logo-circle.webp"
            alt="360° Thrift Studio — Vintage · Premium · Wholesale"
            width={150}
            height={150}
            className="footer-signoff rounded-full border-2 border-bg bg-brand-cream"
          />
          <p className="font-marker text-2xl text-brand-yellow">{nav.business.slogan}</p>
          <p className="max-w-sm text-bg/80">
            Graded pre-owned wholesale lots, bales and bags. Build a quote basket — no payment needed.
          </p>
          {nav.business.locations.length ? (
            <p className="text-sm text-bg/80">
              <span className="font-bold text-bg">Offices &amp; warehouses:</span> {nav.business.locations.join(' · ')}
            </p>
          ) : null}
          {nav.contact.email || nav.contact.phone ? (
            <address className="grid gap-1 not-italic text-bg/80">
              {nav.contact.email ? <a href={`mailto:${nav.contact.email}`} className="hover:underline">{nav.contact.email}</a> : null}
              {nav.contact.phone ? <a href={`tel:${nav.contact.phone.replace(/\s+/g, '')}`} className="hover:underline">{nav.contact.phone}</a> : null}
            </address>
          ) : null}
        </div>
        <Column title="Shop" links={[{ label: 'All lots', href: '/shop' }, ...nav.shop.quick, { label: 'Brands A–Z', href: '/brands' }, { label: 'Styles', href: '/styles' }, nav.catalogue]} />
        <Column title="Trade" links={nav.trade} />
        <Column title="Help" links={HELP} />
      </div>
      <div className="relative border-t border-bg/20">
        <div className="container-site flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-5 font-display text-xl uppercase tracking-wide md:text-2xl">
          <span>Rewear</span><Sparkle tone="yellow" className="size-4" /><span>Resell</span><Sparkle tone="green" className="size-4" /><span>Repeat</span>
          <Crown className="w-8" />
          <span className="text-brand-yellow">Thrift more, waste less</span>
        </div>
      </div>
      <div className="relative border-t border-bg/20">
        <div className="container-site flex flex-col gap-4 py-6 text-sm text-bg/75 lg:flex-row lg:items-center lg:justify-between">
          <p>{BRAND_DISCLAIMER}</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>© {year} {nav.business.name} · {nav.business.tagline}</p>
        </div>
      </div>
    </footer>
  )
}
