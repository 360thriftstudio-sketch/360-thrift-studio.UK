// Money is stored as integer minor units (value × 100) with a currency code.

/** Etsy Money object { amount, divisor, currency_code } → { minor, currency } */
export function fromEtsyMoney(m) {
  if (!m || typeof m !== 'object') return { minor: 0, currency: null }
  const amount = Number(m.amount)
  const divisor = Number(m.divisor) || 1
  if (!Number.isFinite(amount)) return { minor: 0, currency: m.currency_code ?? null }
  return { minor: Math.round((amount / divisor) * 100), currency: m.currency_code ?? null }
}

/** "12.50" | 12.5 → 1250 ; rejects junk */
export function parseMoney(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null
  if (typeof input !== 'string') return null
  const cleaned = input.replace(/[^\d.,-]/g, '')
  if (!cleaned) return null
  // "1.234,56" → European; "1,234.56" → English
  let norm = cleaned
  if (/,\d{1,2}$/.test(cleaned) && cleaned.includes('.')) norm = cleaned.replace(/\./g, '').replace(',', '.')
  else if (/,\d{1,2}$/.test(cleaned)) norm = cleaned.replace(',', '.')
  else norm = cleaned.replace(/,/g, '')
  const n = Number(norm)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export const toMajor = (minor) => Math.round(minor) / 100

export function formatMoney(minor, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD' }).format(toMajor(minor))
  } catch {
    return `${toMajor(minor).toFixed(2)} ${currency ?? ''}`.trim()
  }
}
