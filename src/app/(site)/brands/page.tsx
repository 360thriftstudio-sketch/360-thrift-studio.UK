import type { Metadata } from 'next'
import Link from 'next/link'

import { Crown } from '@/components/brand/Graphics'
import { Breadcrumbs } from '@/components/patterns'
import { BrandLogo } from '@/components/patterns'
import { getLotCounts, getPayloadClient } from '@/lib/catalogue'
import { BRAND_DISCLAIMER, brandLogoMode } from '@/lib/brand-logos'
import type { FashionCategory, Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Brands A–Z',
  description: 'Every brand and stock group we wholesale, grouped by fashion category.',
}

export default async function BrandsIndex() {
  const payload = await getPayloadClient()
  const [brands, styles, settings, counts] = await Promise.all([
    payload.find({ collection: 'brands', sort: 'name', limit: 500, depth: 1 }),
    payload.find({ collection: 'fashion-categories', sort: 'order', limit: 20, depth: 0 }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
    getLotCounts(),
  ])
  const showLogos = Boolean(settings.showBrandLogos)
  const real = brands.docs.filter((b) => b.kind === 'brand' && !b.luxuryOnRequest)
  const groups = real.reduce<Record<string, typeof real>>((acc, b) => {
    const letter = /^[a-z]/i.test(b.name) ? b.name[0].toUpperCase() : '#'
    ;(acc[letter] ??= []).push(b)
    return acc
  }, {})
  const letters = Object.keys(groups).sort()
  const stockGroups = brands.docs.filter((b) => b.kind !== 'brand')
  const luxury = brands.docs.filter((b) => b.luxuryOnRequest)

  return (
    <div className="container-site grid gap-8 py-6">
      <Breadcrumbs items={[{ label: 'Brands', href: '/brands' }]} />
      <header className="grid gap-2">
        <h1 className="text-5xl">Brands A–Z</h1>
        <p className="max-w-2xl text-ink-muted">
          {real.length} brands across 15 sections. {BRAND_DISCLAIMER}
        </p>
      </header>

      <section aria-labelledby="by-style">
        <h2 id="by-style" className="mb-3 text-2xl">By fashion category</h2>
        <ul className="flex flex-wrap gap-2">
          {styles.docs.map((s) => (
            <li key={s.id}>
              <a href={`#style-${s.slug}`} className="inline-flex min-h-9 items-center rounded-pill border-2 border-ink bg-surface px-3 text-sm font-semibold hover:bg-brand-yellow">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Jump to letter" className="sticky top-[var(--header-h-scrolled)] z-10 -mx-2 overflow-x-auto bg-bg/95 px-2 py-2 backdrop-blur">
        <ul className="flex gap-1">
          {letters.map((l) => (
            <li key={l}>
              <a href={`#letter-${l}`} className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface font-bold hover:border-ink">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-8">
        {letters.map((l) => (
          <section key={l} id={`letter-${l}`} aria-labelledby={`h-${l}`} className="scroll-mt-32">
            <h2 id={`h-${l}`} className="mb-3 border-b-2 border-ink pb-1 text-3xl">{l}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {groups[l].map((b) => {
                const logo = typeof b.logoSvg === 'object' ? (b.logoSvg as Media | null) : null
                const mode = brandLogoMode(showLogos, { logoApproved: b.logoApproved, wordmarkOnly: b.wordmarkOnly, hasLogo: !!logo?.url })
                const n = counts.byBrand.get(b.slug) ?? 0
                return (
                  <li key={b.id}>
                    <Link href={`/brands/${b.slug}`} className="flex min-h-16 flex-col justify-center rounded-md border-2 border-ink bg-surface px-3 py-2 hover:bg-brand-yellow">
                      <BrandLogo name={b.name} mode={mode} logoUrl={logo?.url ?? undefined} className="text-sm" />
                      <span className="text-xs text-ink-muted">{n ? `${n} lots` : 'Pre-owned lots'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {styles.docs.map((s) => {
        const inStyle = real.filter((b) => (b.fashionCategories ?? []).some((f) => (typeof f === 'object' ? (f as FashionCategory).id : f) === s.id))
        if (!inStyle.length) return null
        return (
          <section key={s.id} id={`style-${s.slug}`} className="scroll-mt-32" aria-labelledby={`sh-${s.slug}`}>
            <h2 id={`sh-${s.slug}`} className="mb-2 text-2xl">{s.name}</h2>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {inStyle.map((b) => (
                <Link key={b.id} href={`/brands/${b.slug}`} className="underline-offset-2 hover:underline">{b.name}</Link>
              ))}
            </p>
          </section>
        )
      })}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border-2 border-ink bg-surface p-5">
          <h2 className="mb-2 text-2xl">Stock groups &amp; official merchandise</h2>
          <p className="mb-3 text-sm text-ink-muted">Unbranded style lots and verified official league merchandise.</p>
          <ul className="flex flex-wrap gap-2">
            {stockGroups.map((b) => (
              <li key={b.id}>
                <Link href={`/brands/${b.slug}`} className="inline-flex min-h-8 items-center rounded-pill border border-line bg-bg px-3 text-sm hover:border-ink">{b.name}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="relative overflow-hidden rounded-lg border-2 border-ink bg-brand-yellow p-5">
          <Crown className="absolute right-4 top-4 w-14" />
          <h2 className="mb-2 text-2xl">Luxury on request</h2>
          <p className="mb-3 text-sm">{luxury.map((b) => b.name).join(' · ')} — sourced and verified against your request.</p>
          <Link href="/luxury-requests" className="font-bold underline underline-offset-2">Make a luxury request</Link>
        </section>
      </div>
    </div>
  )
}
