import Link from 'next/link'

import { BRAND_DISCLAIMER } from '@/lib/brand-logos'
import type { NavLink, SiteNav } from '@/lib/nav-types'

import { StudioLogo } from '../StudioLogo/StudioLogo'

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
]

function Column({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="mb-3 font-body text-sm font-bold uppercase tracking-wider text-bg/70">{title}</h2>
      <ul className="grid gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-8 items-center hover:underline">
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
    <footer className="mt-24 bg-ink text-bg">
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {/* Build 4: footer sign-off animation plays once when scrolled into view. */}
          <StudioLogo variant="footer" className="text-bg" />
          <p className="mt-4 max-w-sm text-bg/80">
            Graded pre-owned wholesale lots and bales, dispatched from the UK. Build a quote basket — no
            payment needed.
          </p>
          {nav.contact.email || nav.contact.phone ? (
            <address className="mt-4 grid gap-1 not-italic text-bg/80">
              {nav.contact.email ? (
                <a href={`mailto:${nav.contact.email}`} className="hover:underline">
                  {nav.contact.email}
                </a>
              ) : null}
              {nav.contact.phone ? (
                <a href={`tel:${nav.contact.phone.replace(/\s+/g, '')}`} className="hover:underline">
                  {nav.contact.phone}
                </a>
              ) : null}
            </address>
          ) : null}
        </div>
        <Column title="Shop" links={[{ label: 'All lots', href: '/shop' }, ...nav.shop.quick, nav.catalogue]} />
        <Column title="Trade" links={nav.trade} />
        <Column title="Help" links={HELP} />
      </div>
      <div className="border-t border-bg/20">
        <div className="container-site flex flex-col gap-4 py-6 text-sm text-bg/70 lg:flex-row lg:items-center lg:justify-between">
          <p>{BRAND_DISCLAIMER}</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>© {year} 360 Thrift Studio UK</p>
        </div>
      </div>
    </footer>
  )
}
