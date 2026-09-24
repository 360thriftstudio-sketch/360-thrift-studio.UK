import { describe, expect, it } from 'vitest'

import {
  canTransition,
  formatQuoteRef,
  nextQuoteRef,
  nextStatuses,
  parseQuoteRef,
  quoteExpiry,
  reservationExpiry,
} from '@/lib/rfq'

describe('quote references', () => {
  it('formats QR-YYYY-#### with zero padding', () => {
    expect(formatQuoteRef(2026, 1)).toBe('QR-2026-0001')
    expect(formatQuoteRef(2026, 142)).toBe('QR-2026-0142')
    expect(formatQuoteRef(2026, 12345)).toBe('QR-2026-12345')
  })

  it('rejects invalid sequences', () => {
    expect(() => formatQuoteRef(2026, 0)).toThrow()
    expect(() => formatQuoteRef(2026, 1.5)).toThrow()
  })

  it('parses references', () => {
    expect(parseQuoteRef('QR-2026-0142')).toEqual({ year: 2026, sequence: 142 })
    expect(parseQuoteRef('nope')).toBeNull()
  })

  it('increments within a year and restarts on a new year', () => {
    expect(nextQuoteRef(null, 2026)).toBe('QR-2026-0001')
    expect(nextQuoteRef('QR-2026-0141', 2026)).toBe('QR-2026-0142')
    expect(nextQuoteRef('QR-2026-0999', 2027)).toBe('QR-2027-0001')
  })
})

describe('status machine', () => {
  it('follows the spec diagram', () => {
    expect(canTransition('submitted', 'quoted')).toBe(true)
    expect(canTransition('quoted', 'accepted')).toBe(true)
    expect(canTransition('quoted', 'revised')).toBe(true)
    expect(canTransition('revised', 'quoted')).toBe(true)
    expect(canTransition('accepted', 'invoiced')).toBe(true)
    expect(canTransition('invoiced', 'dispatched')).toBe(true)
    expect(canTransition('quoted', 'expired')).toBe(true)
  })

  it('blocks skipping steps', () => {
    expect(canTransition('submitted', 'dispatched')).toBe(false)
    expect(canTransition('submitted', 'accepted')).toBe(false)
    expect(nextStatuses('closed')).toEqual([])
  })

  it('allows saving without a status change', () => {
    expect(canTransition('invoiced', 'invoiced')).toBe(true)
  })
})

describe('timers', () => {
  const t0 = new Date('2026-09-24T09:00:00Z')
  it('soft-reserves stock for 48 h', () => {
    expect(reservationExpiry(t0).toISOString()).toBe('2026-09-26T09:00:00.000Z')
  })
  it('expires quotes after 7 days', () => {
    expect(quoteExpiry(t0).toISOString()).toBe('2026-10-01T09:00:00.000Z')
  })
})
