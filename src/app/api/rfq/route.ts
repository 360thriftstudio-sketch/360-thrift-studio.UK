import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { priceAccess, priceLine, resolveTiers, type PriceList, type PriceTier } from '@/lib/pricing'
import { reservationExpiry } from '@/lib/rfq'
import { fieldErrors, rfqSchema, SHIPPING_METHODS } from '@/lib/schemas'
import type { Customer, PriceList as PriceListDoc } from '@/payload-types'

/**
 * Submit a Request for Quote. Login required (spec). Re-prices every line on
 * the server from lib/pricing, snapshots it onto the Quote, soft-reserves stock
 * for 48 h and emails buyer + staff.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.collection !== 'customers') {
    return NextResponse.json({ error: 'Log in or create an account to send your quote request.' }, { status: 401 })
  }
  const customer = user as unknown as Customer

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = rfqSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) }, { status: 422 })
  }
  const { lines, details, notes } = parsed.data

  const lots = await payload.find({
    collection: 'lots',
    where: { and: [{ id: { in: lines.map((l) => l.lotId) } }, { status: { equals: 'published' } }] },
    depth: 0,
    limit: 100,
    pagination: false,
  })
  const byId = new Map(lots.docs.map((l) => [String(l.id), l]))
  const missing = lines.filter((l) => !byId.has(l.lotId))
  if (missing.length === lines.length) {
    return NextResponse.json({ error: 'Those lots are no longer available.' }, { status: 409 })
  }

  let priceList: PriceList | null = null
  if (customer.priceList) {
    const pl = typeof customer.priceList === 'object'
      ? (customer.priceList as PriceListDoc)
      : await payload.findByID({ collection: 'price-lists', id: customer.priceList, depth: 0, overrideAccess: true })
    priceList = {
      discountPercent: pl.discountPercent,
      overrides: (pl.overrides ?? []).map((o) => ({ lot: String(typeof o.lot === 'object' ? o.lot.id : o.lot), tiers: (o.priceTiers ?? []) as PriceTier[] })),
    }
  }
  const viewer = { loggedIn: true, tradeApproved: customer.tradeStatus === 'approved' }

  const quoteLines = lines
    .filter((l) => byId.has(l.lotId))
    .map((l) => {
      const lot = byId.get(l.lotId)!
      const canSee = priceAccess(lot.priceVisibility, viewer) === 'visible'
      const tiers = resolveTiers(String(lot.id), (lot.priceTiers ?? []) as PriceTier[], priceList)
      const price = canSee ? priceLine({ tiers, qty: l.qty, weightKg: lot.weightKg, pieces: lot.pieces }) : null
      return {
        lot: lot.id,
        qty: l.qty,
        title: lot.title,
        sku: lot.sku,
        guideSubtotalPence: price?.subtotalPence ?? null,
      }
    })

  const quote = await payload.create({
    collection: 'quotes',
    data: {
      status: 'submitted',
      customer: customer.id,
      lines: quoteLines,
      notes: notes || undefined,
      details: { ...details, deadline: details.deadline || undefined },
    },
    overrideAccess: true,
    user,
  })

  // Soft-reserve stock (released by staff or when the quote closes/expires).
  await Promise.all(
    quoteLines.map((l) => {
      const lot = byId.get(String(l.lot))!
      return payload.update({
        collection: 'lots',
        id: lot.id,
        data: { stock: { ...lot.stock, reserved: (lot.stock.reserved ?? 0) + l.qty } },
        overrideAccess: true,
        depth: 0,
      })
    }),
  )

  const shipping = SHIPPING_METHODS.find((s) => s.value === details.shippingMethod)?.label
  const summary = quoteLines.map((l) => `• ${l.qty} × ${l.title} (${l.sku})`).join('\n')
  const reserved = reservationExpiry(new Date()).toUTCString()
  const staffEmail = process.env.STAFF_EMAIL
  await Promise.allSettled([
    payload.sendEmail({
      to: details.email,
      subject: `Quote request ${quote.ref} received — 360° Thrift Studio`,
      text: `Hi ${details.contactName},\n\nThanks — we've got your quote request ${quote.ref}. We'll reply within 1 working day, usually sooner. Your lots are held until ${reserved}.\n\n${summary}\n\nShipping: ${shipping}\n\n360° Thrift Studio — Good clothes. Bigger stories.`,
    }),
    staffEmail
      ? payload.sendEmail({
          to: staffEmail,
          subject: `New RFQ ${quote.ref} — ${details.company}`,
          text: `${details.company} (${details.email}, ${details.country})\n\n${summary}\n\nNotes: ${notes || '—'}`,
        })
      : Promise.resolve(),
  ])

  return NextResponse.json({ ref: quote.ref, id: quote.id, skipped: missing.map((m) => m.lotId) }, { status: 201 })
}
