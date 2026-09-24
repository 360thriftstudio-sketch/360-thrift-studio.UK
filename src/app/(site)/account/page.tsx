import type { Metadata } from 'next'
import Link from 'next/link'

import { Crown, Stroke } from '@/components/brand/Graphics'
import { LogoutButton } from '@/components/account/LogoutButton'
import { QuoteStatusBadge } from '@/components/account/QuoteStatusBadge'
import { SavedLots } from '@/components/account/SavedLots'
import { AuthPanel } from '@/components/forms/AuthPanel'
import { Breadcrumbs } from '@/components/patterns'
import { getPayloadClient } from '@/lib/catalogue'
import { formatPence } from '@/lib/pricing'
import type { QuoteStatus } from '@/lib/rfq'
import { getViewer } from '@/lib/viewer'

export const metadata: Metadata = { title: 'Your account', robots: { index: false } }

const NAV = [
  ['Overview', '#overview'],
  ['Quotes', '#quotes'],
  ['Saved lots', '#saved'],
  ['Company profile', '#profile'],
  ['Documents', '#documents'],
] as const

const TRADE: Record<string, string> = {
  none: 'Not applied — trade prices hidden',
  pending: 'Account check in progress',
  approved: 'Approved — trade prices visible',
  rejected: 'Not approved — contact us',
}

export default async function AccountPage() {
  const viewer = await getViewer()
  if (!viewer.customer) {
    return (
      <div className="container-site grid gap-6 py-6">
        <Breadcrumbs items={[{ label: 'Account', href: '/account' }]} />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <h1 className="text-5xl">Trade account</h1>
            <Stroke className="h-3 w-40 text-brand-green" />
            <p className="text-lg">Log in to send quote requests, track quotes and see trade prices.</p>
            <ul className="grid gap-2">
              <li>✓ Quote history and status updates</li>
              <li>✓ Accept quotes or ask for changes</li>
              <li>✓ Trade prices after a quick account check</li>
            </ul>
            <Crown className="mt-4 w-20" />
          </div>
          <AuthPanel />
        </div>
      </div>
    )
  }

  const c = viewer.customer
  const payload = await getPayloadClient()
  const quotes = await payload.find({ collection: 'quotes', where: { customer: { equals: c.id } }, sort: '-createdAt', limit: 50, depth: 0, overrideAccess: true })
  const open = quotes.docs.filter((q) => !['closed', 'expired', 'dispatched'].includes(q.status)).length

  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Account', href: '/account' }]} />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:grid">
            {NAV.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-10 w-full items-center whitespace-nowrap rounded-md px-3 font-semibold hover:bg-brand-yellow">{label}</a>
              </li>
            ))}
            <li><LogoutButton /></li>
          </ul>
        </nav>
        <div className="grid gap-10">
          <section id="overview" className="grid gap-4 scroll-mt-24">
            <h1 className="text-4xl">Hi {c.contactName.split(' ')[0]}</h1>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border-2 border-ink bg-surface p-4"><p className="text-sm text-ink-muted">Open quotes</p><p className="font-display text-4xl">{open}</p></div>
              <div className="rounded-lg border-2 border-ink bg-surface p-4"><p className="text-sm text-ink-muted">All quotes</p><p className="font-display text-4xl">{quotes.totalDocs}</p></div>
              <div className="rounded-lg border-2 border-ink bg-brand-yellow p-4">
                <p className="text-sm">Trade status</p>
                <p className="font-bold">{TRADE[c.tradeStatus ?? 'none']}</p>
                {c.tradeStatus === 'none' || !c.tradeStatus ? <Link href="/trade-account" className="text-sm font-semibold underline">Open a trade account</Link> : null}
              </div>
            </div>
          </section>

          <section id="quotes" className="grid gap-3 scroll-mt-24" aria-labelledby="quotes-h">
            <h2 id="quotes-h" className="text-3xl">Quotes</h2>
            {quotes.docs.length ? (
              <div className="overflow-x-auto rounded-lg border-2 border-ink bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-bg text-left">
                    <tr>
                      <th scope="col" className="px-4 py-2">Reference</th>
                      <th scope="col" className="px-4 py-2">Date</th>
                      <th scope="col" className="px-4 py-2">Lots</th>
                      <th scope="col" className="px-4 py-2">Guide total</th>
                      <th scope="col" className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.docs.map((q) => {
                      const total = (q.lines ?? []).reduce((n, l) => n + (l.quotedSubtotalPence ?? l.guideSubtotalPence ?? 0), 0)
                      return (
                        <tr key={q.id} className="border-t border-line">
                          <td className="px-4 py-2 font-bold"><Link href={`/account/quotes/${q.id}`} className="text-accent underline underline-offset-2">{q.ref}</Link></td>
                          <td className="px-4 py-2">{new Date(q.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-2">{q.lines?.length ?? 0}</td>
                          <td className="px-4 py-2">{total ? formatPence(total) : '—'}</td>
                          <td className="px-4 py-2"><QuoteStatusBadge status={q.status as QuoteStatus} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border-2 border-dashed border-ink/30 p-6 text-ink-muted">
                No quotes yet. <Link href="/shop" className="font-semibold text-accent underline">Browse lots</Link> and add them to your basket.
              </p>
            )}
          </section>

          <section id="saved" className="grid gap-3 scroll-mt-24">
            <h2 className="text-3xl">Saved lots</h2>
            <SavedLots />
          </section>

          <section id="profile" className="grid gap-3 scroll-mt-24">
            <h2 className="text-3xl">Company profile</h2>
            <dl className="grid gap-x-6 gap-y-1 rounded-lg border-2 border-ink bg-surface p-4 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-ink-muted">Company</dt><dd className="font-semibold">{c.company}</dd>
              <dt className="text-ink-muted">Contact</dt><dd className="font-semibold">{c.contactName}</dd>
              <dt className="text-ink-muted">Email</dt><dd className="font-semibold">{c.email}</dd>
              <dt className="text-ink-muted">Country</dt><dd className="font-semibold">{c.country}</dd>
              {c.vatNumber ? (<><dt className="text-ink-muted">VAT / company no.</dt><dd className="font-semibold">{c.vatNumber}</dd></>) : null}
            </dl>
            <p className="text-sm text-ink-muted">Need to change something? <Link href="/contact" className="underline">Contact us</Link>.</p>
          </section>

          <section id="documents" className="grid gap-3 scroll-mt-24">
            <h2 className="text-3xl">Documents</h2>
            <p className="text-sm text-ink-muted">Quote PDFs and invoices appear on each quote once issued. Catalogues are in the <Link href="/catalogue" className="underline">catalogue book</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
