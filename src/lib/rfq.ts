/**
 * RFQ (Request for Quote) rules: reference numbers and the quote status machine.
 * Mirrors the state diagram in the spec.
 */

export const QUOTE_STATUSES = [
  'submitted',
  'quoted',
  'revised',
  'accepted',
  'invoiced',
  'dispatched',
  'expired',
  'closed',
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: 'Submitted',
  quoted: 'Quoted',
  revised: 'Revision requested',
  accepted: 'Accepted',
  invoiced: 'Invoiced',
  dispatched: 'Dispatched',
  expired: 'Expired',
  closed: 'Closed',
}

const TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  submitted: ['quoted', 'closed'],
  quoted: ['accepted', 'revised', 'expired', 'closed'],
  revised: ['quoted', 'closed'],
  accepted: ['invoiced', 'closed'],
  invoiced: ['dispatched', 'closed'],
  dispatched: ['closed'],
  expired: ['quoted', 'closed'],
  closed: [],
}

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to)
}

export function nextStatuses(from: QuoteStatus): readonly QuoteStatus[] {
  return TRANSITIONS[from]
}

/** Stock is soft-reserved for 48 h after an RFQ is submitted. */
export const RESERVATION_HOURS = 48
/** A sent quote expires after 7 days. */
export const QUOTE_VALID_DAYS = 7

const HOUR = 60 * 60 * 1000

export const reservationExpiry = (submittedAt: Date): Date =>
  new Date(submittedAt.getTime() + RESERVATION_HOURS * HOUR)

export const quoteExpiry = (quotedAt: Date): Date =>
  new Date(quotedAt.getTime() + QUOTE_VALID_DAYS * 24 * HOUR)

/** QR-2026-0001 style reference. Sequence restarts each year. */
export function formatQuoteRef(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error('Sequence must be ≥ 1')
  return `QR-${year}-${String(sequence).padStart(4, '0')}`
}

const REF_PATTERN = /^QR-(\d{4})-(\d{4,})$/

export function parseQuoteRef(ref: string): { year: number; sequence: number } | null {
  const m = REF_PATTERN.exec(ref)
  return m ? { year: Number(m[1]), sequence: Number(m[2]) } : null
}

/** Given the latest reference issued (if any), the next one for `year`. */
export function nextQuoteRef(latestRef: string | null | undefined, year: number): string {
  const parsed = latestRef ? parseQuoteRef(latestRef) : null
  const seq = parsed && parsed.year === year ? parsed.sequence + 1 : 1
  return formatQuoteRef(year, seq)
}
