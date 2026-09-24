import { describe, expect, it } from 'vitest'

import { enquirySchema, fieldErrors, rfqSchema, vatLooksValid } from '@/lib/schemas'
import { jsonLdString } from '@/lib/seo'
import { cn } from '@/lib/utils'

const details = {
  company: 'Resell Co', contactName: 'Sam', email: 'sam@resell.co', country: 'United Kingdom',
  shippingMethod: 'uk-courier', paymentPreference: 'bank-transfer',
}

describe('rfqSchema', () => {
  it('accepts a complete request', () => {
    expect(rfqSchema.safeParse({ lines: [{ lotId: '1', qty: 2 }], details, consent: true }).success).toBe(true)
  })

  it('rejects empty baskets, missing consent and bad email with field messages', () => {
    const r = rfqSchema.safeParse({ lines: [], details: { ...details, email: 'nope' }, consent: false })
    expect(r.success).toBe(false)
    const errs = fieldErrors(r.error!)
    expect(errs.lines).toBe('Your basket is empty')
    expect(errs['details.email']).toMatch(/email address/)
    expect(errs.consent).toMatch(/Tick/)
  })
})

describe('vatLooksValid (warn only)', () => {
  it.each([
    ['', true],
    ['GB123456789', true],
    ['gb 123 4567 89', true],
    ['DE123456789', true],
    ['12345', false],
  ])('%s → %s', (v, ok) => expect(vatLooksValid(v)).toBe(ok))
})

describe('enquirySchema', () => {
  it('flags a filled honeypot', () => {
    const r = enquirySchema.safeParse({ type: 'contact', email: 'a@b.co', website: 'spam' })
    expect(r.success).toBe(false)
  })
})

describe('helpers', () => {
  it('escapes JSON-LD so CMS text cannot close the script tag', () => {
    expect(jsonLdString({ name: '</script><x>' })).not.toContain('</script>')
  })
  it('merges Tailwind classes', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4')
  })
})
