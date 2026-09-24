import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

import { canTransition, type QuoteStatus } from '@/lib/rfq'

const schema = z.object({
  quoteId: z.union([z.string(), z.number()]),
  action: z.enum(['accept', 'revise']),
  message: z.string().trim().max(2000).optional(),
})

/** Buyer actions on their own quote: accept it, or ask for a change. */
export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.collection !== 'customers') return NextResponse.json({ error: 'Log in first.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const quote = await payload.findByID({ collection: 'quotes', id: parsed.data.quoteId, depth: 0, overrideAccess: true }).catch(() => null)
  const ownerId = quote && (typeof quote.customer === 'object' ? quote.customer?.id : quote.customer)
  if (!quote || ownerId !== user.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })

  const to: QuoteStatus = parsed.data.action === 'accept' ? 'accepted' : 'revised'
  if (!canTransition(quote.status as QuoteStatus, to) || quote.status === to) {
    return NextResponse.json({ error: 'This quote can’t be changed right now.' }, { status: 409 })
  }
  const note = parsed.data.message ? `\n\n[${new Date().toISOString()}] Buyer: ${parsed.data.message}` : ''
  await payload.update({
    collection: 'quotes',
    id: quote.id,
    data: { status: to, notes: `${quote.notes ?? ''}${note}`.trim() || undefined },
    overrideAccess: true,
  })
  return NextResponse.json({ ok: true, status: to })
}
