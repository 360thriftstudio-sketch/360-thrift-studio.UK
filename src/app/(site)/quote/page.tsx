import type { Metadata } from 'next'

import { Stroke } from '@/components/brand/Graphics'
import { Breadcrumbs } from '@/components/patterns'
import { RFQFlow, type RFQPrefill } from '@/components/quote/RFQFlow'
import { getPayloadClient } from '@/lib/catalogue'
import { getViewer } from '@/lib/viewer'

export const metadata: Metadata = { title: 'Your quote basket', robots: { index: false } }

export default async function QuotePage() {
  const [viewer, payload] = await Promise.all([getViewer(), getPayloadClient()])
  const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })
  const c = viewer.customer
  const prefill: RFQPrefill = c
    ? { company: c.company, contactName: c.contactName, email: c.email, phone: c.phone ?? '', vatNumber: c.vatNumber ?? '', country: c.country }
    : {}
  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Quote basket', href: '/quote' }]} />
      <header>
        <h1 className="text-5xl">Request a quote</h1>
        <Stroke className="h-3 w-44 text-brand-blue" />
        <p className="mt-2 max-w-2xl text-ink-muted">The quote is the checkout: send one request, we reply with a quote and invoice. No payment needed now.</p>
      </header>
      <RFQFlow prefill={prefill} whatsapp={settings.contact?.whatsapp} />
    </div>
  )
}
