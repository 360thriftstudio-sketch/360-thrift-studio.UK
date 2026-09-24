import { RichText } from '@payloadcms/richtext-lexical/react'
import type { ReactNode } from 'react'
import { Clock, Package, ShieldCheck, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Sparkle, Stroke } from '@/components/brand/Graphics'
import { LotGrid, StockBadges, lotToLine } from '@/components/catalogue'
import { BuyBox } from '@/components/lot/BuyBox'
import { Gallery } from '@/components/lot/Gallery'
import { MixBreakdownChart } from '@/components/lot/MixBreakdownChart'
import { RecentlyViewed } from '@/components/lot/RecentlyViewed'
import { Breadcrumbs } from '@/components/patterns'
import { findOne, getLots, getPayloadClient, toSummary } from '@/lib/catalogue'
import { ERA_LABELS, GRADE_LABELS, LOT_TYPE_LABELS, singleLotPence, type LotSummary } from '@/lib/facets'
import { jsonLdString } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lot = await findOne('lots', slug, 1)
  if (!lot || lot.status !== 'published') return {}
  return {
    title: lot.seo?.title || lot.title,
    description:
      lot.seo?.description ||
      `${lot.title}. ${lot.pieces ? `${lot.pieces} pieces · ` : ''}${lot.weightKg ? `${lot.weightKg} kg · ` : ''}graded pre-owned wholesale lot.`,
    alternates: { canonical: `/lot/${slug}` },
  }
}

const AVAILABILITY: Record<string, string> = {
  'in-stock': 'https://schema.org/InStock',
  low: 'https://schema.org/LimitedAvailability',
  arriving: 'https://schema.org/PreOrder',
  reserved: 'https://schema.org/LimitedAvailability',
  sold: 'https://schema.org/SoldOut',
}

function Section({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b-2 border-ink py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-2xl transition-transform duration-[var(--dur-base)] group-open:rotate-45">+</span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  )
}

export default async function LotPage({ params }: Props) {
  const { slug } = await params
  const doc = await findOne('lots', slug, 1)
  if (!doc || doc.status !== 'published') notFound()
  const lot = toSummary(doc)
  if (!lot) notFound()

  const payload = await getPayloadClient()
  const [settings, related, sameBrand] = await Promise.all([
    payload.findGlobal({ slug: 'settings', depth: 0 }),
    lot.subcategories[0] ? getLots({ subcategory: { in: [lot.subcategories[0].id] } }) : Promise.resolve([] as LotSummary[]),
    lot.brands[0] ? getLots({ 'brands.brand': { equals: lot.brands[0].id } }) : Promise.resolve([] as LotSummary[]),
  ])
  const others = (xs: LotSummary[]) => xs.filter((l) => l.id !== lot.id && l.stock.status !== 'sold').slice(0, 4)
  const relatedLots = others(related)
  const sameBrandLots = others(sameBrand).filter((l) => !relatedLots.some((r) => r.id === l.id))
  const titles = Object.fromEntries([...related, ...sameBrand].map((l) => [l.slug, l.title]))

  const sold = lot.stock.status === 'sold'
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const price = singleLotPence(lot)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: lot.title,
    sku: lot.sku,
    category: lot.section.name,
    brand: lot.brands.length === 1 ? { '@type': 'Brand', name: lot.brands[0].name } : undefined,
    itemCondition: 'https://schema.org/UsedCondition',
    image: lot.images.map((i) => i.url),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      price: price != null ? (price / 100).toFixed(2) : undefined,
      availability: AVAILABILITY[lot.stock.status],
      url: `${siteUrl}/lot/${lot.slug}`,
    },
  }

  const specs: [string, string][] = [
    ['Pieces', lot.pieces ? String(lot.pieces) : '—'],
    ['Weight', lot.weightKg ? `${lot.weightKg} kg` : '—'],
    ['Grade', GRADE_LABELS[lot.grade]],
    ['SKU', lot.sku],
  ]
  const details: [string, string][] = [
    ['Lot type', LOT_TYPE_LABELS[lot.lotType]],
    ['Section', lot.section.name],
    ...(lot.subcategories.length ? [['Subcategory', lot.subcategories.map((s) => s.name).join(', ')] as [string, string]] : []),
    ...(lot.collection ? [['Collection', `${lot.collection.name}${lot.collection.tier ? ` (${lot.collection.tier})` : ''}`] as [string, string]] : []),
    ...(lot.era ? [['Era', ERA_LABELS[lot.era] ?? lot.era] as [string, string]] : []),
    ...(lot.division.length ? [['Division', lot.division.map((d) => ({ womens: "Women's", mens: "Men's", unisex: 'Unisex' })[d] ?? d).join(', ')] as [string, string]] : []),
    ...(lot.styles.length ? [['Fashion category', lot.styles.map((s) => s.name).join(', ')] as [string, string]] : []),
  ]
  const descriptorGroups = [...lot.descriptors, ...lot.designGroups].reduce<Record<string, string[]>>((acc, d) => {
    ;(acc[d.group] ??= []).push(d.name)
    return acc
  }, {})

  return (
    <div className="container-site grid gap-10 pb-28 pt-4 lg:pb-12">
      <Breadcrumbs
        items={[
          { label: 'Shop', href: '/shop' },
          { label: lot.section.name, href: `/shop/${lot.section.slug}` },
          ...(lot.subcategories[0] ? [{ label: lot.subcategories[0].name, href: `/shop/${lot.section.slug}/${lot.subcategories[0].slug}` }] : []),
          { label: lot.title, href: `/lot/${lot.slug}` },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <Gallery images={lot.images} label={lot.section.name} seed={lot.section.number} />

        <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
          <div className="grid gap-4 rounded-lg border-2 border-ink bg-surface p-5 shadow-[6px_6px_0_0_var(--brand-black)]">
            <StockBadges lot={lot} max={4} />
            <h1 className="text-3xl leading-tight md:text-4xl">{lot.title}</h1>
            <dl className="grid grid-cols-4 divide-x divide-line rounded-md border border-line bg-bg text-center">
              {specs.map(([k, v]) => (
                <div key={k} className="px-2 py-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{k}</dt>
                  <dd className="truncate font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <BuyBox
              line={lotToLine(lot)}
              tiers={lot.priceTiers}
              visibility={lot.priceVisibility}
              weightKg={lot.weightKg}
              pieces={lot.pieces}
              moq={Math.max(1, lot.stock.moq ?? 1)}
              max={lot.stock.lotsAvailable > 0 ? lot.stock.lotsAvailable : 999}
              sold={sold}
              whatsapp={settings.contact?.whatsapp}
              url={`${siteUrl}/lot/${lot.slug}`}
            />
            <ul className="grid gap-2 text-sm">
              <li className="flex items-center gap-2"><Truck aria-hidden className="size-4" /> {lot.stock.dispatch || '24h dispatch'} after payment · UK &amp; worldwide</li>
              <li className="flex items-center gap-2"><Package aria-hidden className="size-4" /> Minimum order: {lot.stock.moq ?? 1} {lot.stock.moq === 1 || !lot.stock.moq ? 'lot' : 'lots'} · {lot.stock.lotsAvailable} available</li>
              <li className="flex items-center gap-2"><Clock aria-hidden className="size-4" /> Held for 48 h when you request a quote</li>
              <li className="flex items-center gap-2"><ShieldCheck aria-hidden className="size-4" /> Graded by hand · <Link href="/grading" className="underline underline-offset-2">grading guide</Link></li>
            </ul>
            {lot.bestFor.length ? (
              <div className="grid gap-2">
                <p className="text-sm font-bold">Best suited for</p>
                <ul className="flex flex-wrap gap-1.5">
                  {lot.bestFor.map((b) => (
                    <li key={b.id} className="rounded-pill bg-brand-green px-2.5 py-1 text-xs font-semibold text-ink">{b.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="border-t-2 border-ink">
          <Section title="Description" open>
            <div className="prose-sm grid gap-3">
              {doc.description ? <RichText data={doc.description} /> : (
                <p>
                  {lot.title}. {lot.pieces ? `${lot.pieces} pieces` : ''}{lot.weightKg ? `, approx. ${lot.weightKg} kg` : ''}, sorted and graded by hand in our warehouse. Stock photos of the actual lot are added before dispatch on request.
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                {details.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(descriptorGroups).length ? (
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(descriptorGroups).flatMap(([g, terms]) =>
                    terms.map((t) => (
                      <li key={`${g}-${t}`} className="rounded-pill border border-line bg-bg px-2.5 py-1 text-xs"><span className="text-ink-muted">{g}:</span> {t}</li>
                    )),
                  )}
                </ul>
              ) : null}
            </div>
          </Section>
          {lot.brands.some((b) => b.count) ? (
            <Section title="Mix breakdown" open>
              <MixBreakdownChart items={lot.brands.map((b) => ({ label: b.name, count: b.count ?? 0 }))} />
            </Section>
          ) : null}
          <Section title="Grading">
            <p className="text-sm">
              This lot is <strong>{GRADE_LABELS[lot.grade]}</strong>. Cream is top pick; Grade A is very good pre-owned condition; Grade B has minor flaws and is priced for volume.{' '}
              <Link href="/grading" className="font-semibold text-accent underline underline-offset-2">Full grading guide</Link>
            </p>
          </Section>
          <Section title="Shipping">
            <p className="text-sm">Collect from the warehouse, UK courier, pallet or international shipping. Shipping is priced on your quote. {lot.stock.dispatch || '24h dispatch'} after payment.</p>
          </Section>
          <Section title="FAQ">
            <dl className="grid gap-3 text-sm">
              <div><dt className="font-bold">Do I pay now?</dt><dd>No — add it to your quote basket and request a quote. We reply within 1 working day.</dd></div>
              <div><dt className="font-bold">Can I see more photos?</dt><dd>Yes. Ask on WhatsApp or in your quote notes.</dd></div>
              <div><dt className="font-bold">Are prices final?</dt><dd>Guide prices exclude VAT and shipping. Your quote has the final price.</dd></div>
            </dl>
          </Section>
        </div>
        <aside className="relative hidden overflow-hidden rounded-lg border-2 border-ink bg-brand-yellow p-6 lg:block">
          <Sparkle tone="blue" className="absolute right-4 top-4 w-8" />
          <p className="font-marker text-2xl">Good clothes. Bigger stories.</p>
          <Stroke className="my-2 h-3 w-40" />
          <p className="text-sm">
            Independent reseller of pre-owned goods. Not affiliated with or endorsed by any brand shown. Brand names describe the goods only.
          </p>
        </aside>
      </div>

      {relatedLots.length ? (
        <section aria-labelledby="related" className="grid gap-4">
          <h2 id="related" className="text-3xl">More {lot.subcategories[0]?.name ?? lot.section.name}</h2>
          <LotGrid lots={relatedLots} />
        </section>
      ) : null}
      {sameBrandLots.length ? (
        <section aria-labelledby="same-brand" className="grid gap-4">
          <h2 id="same-brand" className="text-3xl">More from {lot.brands[0]?.name}</h2>
          <LotGrid lots={sameBrandLots} />
        </section>
      ) : null}
      <RecentlyViewed current={lot.slug} titles={titles} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </div>
  )
}
