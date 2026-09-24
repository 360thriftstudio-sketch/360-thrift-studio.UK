import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { enquirySchema, fieldErrors } from '@/lib/schemas'

/** Trade account, luxury request, contact, newsletter and visit forms. Honeypot protected. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = enquirySchema.safeParse(body)
  if (!parsed.success) {
    // Honeypot filled → pretend success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === 'website')) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) }, { status: 422 })
  }
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const { website: _hp, ...data } = parsed.data
  const customerId = user?.collection === 'customers' ? user.id : undefined

  await payload.create({
    collection: 'enquiries',
    data: { ...data, customer: customerId },
    overrideAccess: true,
  })
  if (data.type === 'trade-account' && customerId) {
    await payload.update({ collection: 'customers', id: customerId, data: { tradeStatus: 'pending' }, overrideAccess: true })
  }
  if (process.env.STAFF_EMAIL) {
    await payload
      .sendEmail({ to: process.env.STAFF_EMAIL, subject: `New ${data.type} enquiry — ${data.email}`, text: JSON.stringify(data, null, 2) })
      .catch(() => undefined)
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
