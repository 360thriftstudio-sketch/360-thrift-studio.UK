import type { Metadata } from 'next'

import { Crown, Sparkle } from '@/components/brand/Graphics'
import { EnquiryForm } from '@/components/forms/EnquiryForm'
import { Breadcrumbs } from '@/components/patterns'

export const metadata: Metadata = {
  title: 'Luxury on request',
  description: 'Dior, Gucci and Louis Vuitton sourced and verified against your request.',
}

export default function LuxuryRequestsPage() {
  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Luxury requests', href: '/luxury-requests' }]} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="relative grid content-start gap-4 overflow-hidden rounded-lg border-2 border-ink bg-ink p-8 text-bg">
          <Crown className="w-20" />
          <Sparkle tone="yellow" className="absolute right-8 top-8 w-8" />
          <h1 className="text-5xl text-bg">Luxury on request</h1>
          <p className="text-lg text-bg/85">Dior · Gucci · Louis Vuitton</p>
          <p className="text-bg/85">Tell us the brand, model and budget — we’ll source and verify it for you. Individual bags and selected assortments, subject to availability.</p>
          <p className="text-sm text-bg/70">Independent reseller of pre-owned goods. Not affiliated with or endorsed by any brand shown.</p>
        </div>
        <div className="rounded-lg border-2 border-ink bg-surface p-5">
          <EnquiryForm
            type="luxury"
            draftKey="thrift360.luxury.v1"
            submitLabel="Send luxury request"
            success="We’ll come back with availability and options within 2 working days."
            fields={[
              { name: 'brand', label: 'Brand', type: 'select', required: true, options: ['Dior', 'Gucci', 'Louis Vuitton', 'Other'].map((b) => ({ value: b, label: b })) },
              { name: 'model', label: 'Model / style', required: true, hint: 'e.g. Saddle bag, Speedy 30, Jackie' },
              { name: 'size', label: 'Size' },
              { name: 'material', label: 'Material / colour' },
              { name: 'condition', label: 'Condition', type: 'select', options: ['Excellent', 'Very good', 'Good', 'Any'].map((b) => ({ value: b, label: b })) },
              { name: 'quantity', label: 'Quantity' },
              { name: 'budget', label: 'Budget (GBP)', required: true },
              { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
              { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
              { name: 'company', label: 'Company', autoComplete: 'organization' },
              { name: 'message', label: 'Notes', type: 'textarea' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
