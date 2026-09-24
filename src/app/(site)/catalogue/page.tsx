import type { Metadata } from 'next'
import Link from 'next/link'

import { Crown, Drip, Splatter } from '@/components/brand/Graphics'
import { EnquiryForm } from '@/components/forms/EnquiryForm'
import { Breadcrumbs } from '@/components/patterns'
import { getLotCounts, getPayloadClient, getSections } from '@/lib/catalogue'

export const metadata: Metadata = {
  title: 'Catalogue book',
  description: 'The 360° Thrift Studio catalogue: all 15 sections and dedicated brand assortments.',
}

const TONES = ['yellow', 'blue', 'green'] as const

/**
 * Catalogue book. Covers link to live sections/brands now; Build 5 adds the
 * flipbook viewer and PDFs generated from CMS data (never out of date).
 */
export default async function CataloguePage() {
  const payload = await getPayloadClient()
  const [sections, collections, counts] = await Promise.all([
    getSections(),
    payload.find({ collection: 'brand-collections', limit: 12, sort: 'order', depth: 1 }),
    getLotCounts(),
  ])
  const brands = [...new Map(collections.docs.map((c) => [typeof c.brand === 'object' ? c.brand.id : c.brand, c.brand])).values()].filter((b) => typeof b === 'object')

  return (
    <div className="container-site grid gap-10 py-6">
      <Breadcrumbs items={[{ label: 'Catalogue', href: '/catalogue' }]} />
      <header className="relative grid gap-3 overflow-hidden rounded-lg border-2 border-ink bg-brand-yellow p-8">
        <Splatter tone="blue" className="absolute -right-10 -top-10 w-64 opacity-70" />
        <Crown className="relative w-16" />
        <h1 className="relative text-5xl md:text-6xl">The catalogue book</h1>
        <p className="relative max-w-xl text-lg">Vintage · Premium · Wholesale — 15 sections, the brands we stock and every dedicated assortment.</p>
        <p className="relative text-sm">Interactive flipbook and PDF downloads are coming soon. Browse the live catalogue below or ask for the PDF.</p>
        <Drip className="absolute inset-x-0 bottom-0 h-6 w-full" tone="black" />
      </header>

      <section aria-labelledby="sec" className="grid gap-4">
        <h2 id="sec" className="text-3xl">Sections</h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <Link href="/shop" className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-md border-2 border-ink bg-ink p-4 text-bg shadow-[4px_4px_0_0_var(--brand-yellow)]">
              <span className="font-marker text-lg text-brand-yellow">Full catalogue</span>
              <span className="font-display text-3xl uppercase leading-none">All 15 sections</span>
            </Link>
          </li>
          {sections.map((s, i) => (
            <li key={s.id}>
              <Link href={`/shop/${s.slug}`} className="group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-md border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_0_var(--brand-black)] transition-transform hover:-rotate-1">
                <Splatter tone={TONES[i % 3]} className="absolute -right-8 -top-8 w-40 opacity-80" />
                <span className="relative font-display text-5xl leading-none">{String(s.number).padStart(2, '0')}</span>
                <span className="relative">
                  <span className="block font-display text-xl uppercase leading-tight">{s.name}</span>
                  <span className="text-xs text-ink-muted">{counts.bySection.get(s.slug) ?? 0} lots live</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bc" className="grid gap-4">
        <h2 id="bc" className="text-3xl">Brand assortments</h2>
        <ul className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/brands/${b.slug}`} className="inline-flex min-h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 font-semibold hover:bg-brand-yellow">{b.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pdf" className="grid gap-4 rounded-lg border-2 border-ink bg-surface p-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="pdf" className="text-3xl">Get the PDF catalogue</h2>
          <p className="text-ink-muted">We’ll email you the latest section and brand PDFs.</p>
        </div>
        <EnquiryForm
          type="contact"
          submitLabel="Email me the catalogue"
          success="We’ll send the latest catalogue PDFs to your inbox."
          fields={[
            { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            { name: 'company', label: 'Company', autoComplete: 'organization' },
            { name: 'catalogue', label: 'Which catalogue?', type: 'select', options: [{ value: 'all', label: 'Full catalogue' }, ...sections.map((s) => ({ value: s.name, label: s.name }))] },
          ]}
        />
      </section>
    </div>
  )
}
