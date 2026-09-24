import type { Metadata } from 'next'

import { Crown, Splatter, Stroke } from '@/components/brand/Graphics'
import { EnquiryForm } from '@/components/forms/EnquiryForm'
import { Breadcrumbs } from '@/components/patterns'
import { getPayloadClient } from '@/lib/catalogue'

export const metadata: Metadata = {
  title: 'Open a trade account',
  description: 'Apply for a 360° Thrift Studio trade account to see trade prices and send quote requests.',
}

export default async function TradeAccountPage() {
  const payload = await getPayloadClient()
  const buyerTypes = await payload.find({ collection: 'buyer-types', limit: 12, depth: 0, sort: 'createdAt' })
  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Trade account', href: '/trade-account' }]} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="relative grid content-start gap-4">
          <Splatter tone="green" className="absolute -left-10 -top-6 -z-10 w-56 opacity-60" />
          <h1 className="text-5xl">Open a trade account</h1>
          <Stroke className="h-3 w-44 text-brand-blue" />
          <p className="text-lg">A quick account check keeps trade pricing for trade buyers. Most checks are done within 1 working day.</p>
          <ul className="grid gap-2">
            <li>✓ See trade prices on every lot</li>
            <li>✓ Account-level price lists for regular buyers</li>
            <li>✓ Quote history, accept quotes online</li>
            <li>✓ UK &amp; international buyers welcome</li>
          </ul>
          <Crown className="w-16" />
        </div>
        <div className="rounded-lg border-2 border-ink bg-surface p-5 shadow-[6px_6px_0_0_var(--brand-black)]">
          <EnquiryForm
            type="trade-account"
            draftKey="thrift360.tradeAccount.v1"
            submitLabel="Apply for a trade account"
            success="We’ll check your details and email you within 1 working day. If you haven’t yet, create a login from the Account page so we can link it."
            fields={[
              { name: 'company', label: 'Company', required: true, autoComplete: 'organization' },
              { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
              { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
              { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
              { name: 'country', label: 'Country', required: true, autoComplete: 'country-name' },
              { name: 'vatNumber', label: 'VAT / company no.' },
              { name: 'buyerType', label: 'What kind of buyer are you?', type: 'select', required: true, options: buyerTypes.docs.map((b) => ({ value: b.name, label: b.name })) },
              { name: 'sellingChannels', label: 'Where do you sell?', hint: 'e.g. Depop, Vinted, eBay, shop, markets, export' },
              { name: 'monthlyVolume', label: 'Typical monthly volume', type: 'select', options: [
                { value: 'under-5', label: 'Under 5 lots' }, { value: '5-20', label: '5–20 lots' }, { value: '20-50', label: '20–50 lots' }, { value: '50-plus', label: '50+ lots / pallets' },
              ] },
              { name: 'message', label: 'Anything else?', type: 'textarea' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
