// Receipts are reduced to an allow-list before anything is written to disk.
// Allow-listing (rather than deleting known PII keys) means a new Etsy field can never leak buyer data.
import { fromEtsyMoney } from './money.js'

const toIso = (ts) => (Number.isFinite(Number(ts)) && ts ? new Date(Number(ts) * 1000).toISOString() : null)

export function sanitizeTransaction(t, createdAt) {
  const price = fromEtsyMoney(t.price)
  return {
    transaction_id: Number(t.transaction_id),
    listing_id: t.listing_id ? Number(t.listing_id) : null,
    product_id: t.product_id ? Number(t.product_id) : null,
    title: typeof t.title === 'string' ? t.title.slice(0, 300) : null,
    sku: typeof t.sku === 'string' ? t.sku.slice(0, 64) : null,
    quantity: Number(t.quantity) || 0,
    price_minor: price.minor,
    currency: price.currency,
    is_digital: t.is_digital ? 1 : 0,
    created_at: toIso(t.created_timestamp ?? t.create_timestamp) ?? createdAt,
    // Variations are dropped entirely: personalisation answers often contain names.
  }
}

export function sanitizeReceipt(r) {
  const createdAt = toIso(r.created_timestamp ?? r.create_timestamp)
  const subtotal = fromEtsyMoney(r.subtotal)
  const grand = fromEtsyMoney(r.grandtotal)
  return {
    receipt_id: Number(r.receipt_id),
    created_at: createdAt,
    status: typeof r.status === 'string' ? r.status.toLowerCase() : null,
    is_paid: r.is_paid ? 1 : 0,
    subtotal_minor: subtotal.minor,
    grandtotal_minor: grand.minor,
    discount_minor: fromEtsyMoney(r.discount_amt).minor,
    shipping_minor: fromEtsyMoney(r.total_shipping_cost).minor,
    currency: subtotal.currency ?? grand.currency,
    transactions: Array.isArray(r.transactions) ? r.transactions.map((t) => sanitizeTransaction(t, createdAt)) : [],
  }
}

export function sanitizeReview(rv) {
  return {
    listing_id: rv.listing_id ? Number(rv.listing_id) : null,
    rating: Number(rv.rating) || null,
    created_at: toIso(rv.created_timestamp ?? rv.create_timestamp),
  }
}

/** Deep check used by tests and the snapshot writer: no buyer-identifying keys anywhere. */
const PII_KEYS = /^(buyer_email|buyer_user_id|name|first_line|second_line|city|state|zip|country_iso|formatted_address|phone|message_from_buyer|message_from_seller|message_from_payment|gift_message|payment_email|shipments|seller_email|buyer|email|address|variations|personalization)$/i
export function findPii(obj, trail = '') {
  if (Array.isArray(obj)) return obj.flatMap((v, i) => findPii(v, `${trail}[${i}]`))
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => (PII_KEYS.test(k) ? [`${trail}.${k}`] : findPii(v, `${trail}.${k}`)))
  }
  return []
}
