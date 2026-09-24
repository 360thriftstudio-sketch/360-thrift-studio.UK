import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { QuoteActions } from '@/components/account/QuoteActions'
import { QuoteStatusBadge } from '@/components/account/QuoteStatusBadge'
import { Breadcrumbs } from '@/components/patterns'
import type { BasketLine } from '@/lib/basket-store'
import { getPayloadClient } from '@/lib/catalogue'
import { formatPence, type PriceTier } from '@/lib/pricing'
import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@/lib/rfq'
import { getViewer } from '@/lib/viewer'
import type { Lot, Media } from '@/payload-types'

export const metadata: Metadata = { title: 'Quote', robots: { index: false } }

const FLOW: QuoteStatus[] = ['submitted', 'quoted', 'accepted', 'invoiced', 'dispatched']

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer()
  if (!viewer.customer) redirect('/account')
  const { id } = await params
  const payload = await getPayloadClient()
  const quote = await payload.findByID({ collection: 'quotes', id, depth: 2, overrideAccess: true }).catch(() => null)
  const owner = quote && (typeof quote.customer === 'object' ? quote.customer?.id : quote.customer)
  if (!quote || owner !== viewer.customer.id) notFound()

  const status = quote.status as QuoteStatus
  const reached = FLOW.indexOf(status === 'revised' ? 'quoted' : status)
  const lines: BasketLine[] = (quote.lines ?? [])
    .map((l) => ({ l, lot: typeof l.lot === 'object' ? (l.lot as Lot) : null }))
    .filter((x) => x.lot && x.lot.status === 'published')
    .map(({ l, lot }) => ({
      lotId: String(lot!.id),
      slug: lot!.slug,
      title: lot!.title,
      sku: lot!.sku,
      qty: l.qty,
      tiers: (lot!.priceTiers ?? []) as PriceTier[],
      priceVisibility: lot!.priceVisibility,
      weightKg: lot!.weightKg,
      pieces: lot!.pieces,
      maxQty: lot!.stock.lotsAvailable,
      moq: lot!.stock.moq,
    }))
  const pdf = typeof quote.quotePdf === 'object' ? (quote.quotePdf as Media | null) : null
  const total = (quote.lines ?? []).reduce((n, l) => n + (l.quotedSubtotalPence ?? l.guideSubtotalPence ?? 0), 0)

  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Account', href: '/account' }, { label: quote.ref ?? 'Quote', href: `/account/quotes/${quote.id}` }]} />
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl">Quote {quote.ref}</h1>
        <QuoteStatusBadge status={status} />
      </header>

      <ol className="grid grid-cols-5 gap-2 text-center text-xs sm:text-sm" aria-label="Quote progress">
        {FLOW.map((s, i) => (
          <li key={s} aria-current={i === reached ? 'step' : undefined} className="grid gap-1">
            <span className={`h-2 rounded-pill ${i <= reached ? 'bg-brand-green' : 'bg-line'}`} />
            <span className={i === reached ? 'font-bold' : 'text-ink-muted'}>{QUOTE_STATUS_LABELS[s]}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-x-auto rounded-lg border-2 border-ink bg-surface">
          <table className="w-full text-sm">
            <caption className="sr-only">Lots in this quote</caption>
            <thead className="bg-bg text-left">
              <tr><th scope="col" className="px-4 py-2">Lot</th><th scope="col" className="px-4 py-2">Qty</th><th scope="col" className="px-4 py-2">Guide</th><th scope="col" className="px-4 py-2">Quoted</th></tr>
            </thead>
            <tbody>
              {(quote.lines ?? []).map((l) => {
                const lot = typeof l.lot === 'object' ? (l.lot as Lot) : null
                return (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-2">{lot ? <Link href={`/lot/${lot.slug}`} className="font-semibold hover:underline">{l.title}</Link> : l.title}<br /><span className="text-xs text-ink-muted">{l.sku}</span></td>
                    <td className="px-4 py-2">{l.qty}</td>
                    <td className="px-4 py-2">{l.guideSubtotalPence != null ? formatPence(l.guideSubtotalPence) : 'Quote'}</td>
                    <td className="px-4 py-2 font-bold">{l.quotedSubtotalPence != null ? formatPence(l.quotedSubtotalPence) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
        <aside className="grid content-start gap-4 rounded-lg border-2 border-ink bg-surface p-5">
          <p className="flex justify-between"><span>Total</span><span className="font-display text-2xl">{total ? formatPence(total) : '—'}</span></p>
          <p className="text-xs text-ink-muted">Excl. VAT &amp; shipping unless stated on your quote PDF.</p>
          {quote.expiresAt && status === 'quoted' ? <p className="text-sm">Valid until <strong>{new Date(quote.expiresAt).toLocaleDateString('en-GB')}</strong></p> : null}
          {pdf?.url ? <a href={pdf.url} className="font-semibold text-accent underline">Download quote PDF</a> : <p className="text-sm text-ink-muted">Your quote PDF appears here once sent.</p>}
          <QuoteActions quoteId={quote.id} status={status} lines={lines} />
        </aside>
      </div>
      {quote.notes ? (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-2 text-xl">Notes</h2>
          <p className="whitespace-pre-line text-sm">{quote.notes}</p>
        </section>
      ) : null}
    </div>
  )
}
