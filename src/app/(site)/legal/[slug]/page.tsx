import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InfoPage } from '@/components/blocks/InfoPage'
import { findOne } from '@/lib/catalogue'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await findOne('pages', slug, 0)
  if (!page || page.group !== 'legal') return {}
  return { title: page.title }
}

export default async function LegalRoute({ params }: Props) {
  const { slug } = await params
  const page = await findOne('pages', slug, 0)
  if (!page || page.group !== 'legal' || page.status !== 'published') notFound()
  return <InfoPage page={page} breadcrumbs={[{ label: 'Legal', href: '/legal/terms' }, { label: page.title, href: `/legal/${page.slug}` }]} />
}
