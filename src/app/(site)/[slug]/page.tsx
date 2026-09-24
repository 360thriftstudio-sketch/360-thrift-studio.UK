import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { InfoPage } from '@/components/blocks/InfoPage'
import { EnquiryForm } from '@/components/forms/EnquiryForm'
import { findOne } from '@/lib/catalogue'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await findOne('pages', slug, 0)
  if (!page || page.group !== 'info') return {}
  return { title: page.seo?.title || page.title, description: page.seo?.description || page.intro }
}

const FORMS: Record<string, ReactNode> = {
  contact: (
    <div className="rounded-lg border-2 border-ink bg-surface p-5">
      <h2 className="mb-3 text-2xl">Send a message</h2>
      <EnquiryForm
        type="contact"
        submitLabel="Send message"
        success="Thanks — we’ll reply within 1 working day, usually sooner."
        fields={[
          { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
          { name: 'company', label: 'Company', autoComplete: 'organization', wide: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true },
        ]}
      />
    </div>
  ),
  'warehouse-visit': (
    <div className="rounded-lg border-2 border-ink bg-surface p-5">
      <h2 className="mb-3 text-2xl">Book a visit</h2>
      <EnquiryForm
        type="warehouse-visit"
        submitLabel="Request a visit"
        success="We’ll confirm a time by email within 1 working day."
        fields={[
          { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
          { name: 'company', label: 'Company', autoComplete: 'organization' },
          { name: 'warehouse', label: 'Warehouse', type: 'select', required: true, options: [{ value: 'uk', label: 'United Kingdom' }, { value: 'pk', label: 'Pakistan' }] },
          { name: 'date', label: 'Preferred date', type: 'date', required: true },
          { name: 'message', label: 'Sections you’re interested in', type: 'textarea' },
        ]}
      />
    </div>
  ),
}

export default async function InfoRoute({ params }: Props) {
  const { slug } = await params
  const page = await findOne('pages', slug, 0)
  if (!page || page.group !== 'info' || page.status !== 'published') notFound()
  return <InfoPage page={page} breadcrumbs={[{ label: page.title, href: `/${page.slug}` }]}>{FORMS[slug]}</InfoPage>
}
