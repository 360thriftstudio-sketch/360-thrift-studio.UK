import { describe, expect, it } from 'vitest'

import { brandLogoAlt, brandLogoMode, brandPageDisclaimer } from '@/lib/brand-logos'
import { slugify } from '@/lib/utils'

describe('brandLogoMode — legal guardrail', () => {
  const approved = { logoApproved: true, hasLogo: true }

  it('never shows a logo while the global switch is off', () => {
    expect(brandLogoMode(false, approved)).toBe('wordmark')
  })

  it('requires per-brand approval and an uploaded SVG', () => {
    expect(brandLogoMode(true, { logoApproved: false, hasLogo: true })).toBe('wordmark')
    expect(brandLogoMode(true, { logoApproved: null, hasLogo: true })).toBe('wordmark')
    expect(brandLogoMode(true, { logoApproved: true, hasLogo: false })).toBe('wordmark')
    expect(brandLogoMode(true, { ...approved, wordmarkOnly: true })).toBe('wordmark')
    expect(brandLogoMode(true, approved)).toBe('logo')
  })

  it('builds alt text and disclaimers', () => {
    expect(brandLogoAlt('The North Face')).toBe('The North Face — view lots')
    expect(brandPageDisclaimer('Carhartt')).toContain('not affiliated with Carhartt')
  })
})

describe('slugify', () => {
  it('produces kebab-case slugs', () => {
    expect(slugify('Pants & Trousers')).toBe('pants-and-trousers')
    expect(slugify("Levi's")).toBe('levis')
    expect(slugify('Outdoor & Technical / Gorpcore')).toBe('outdoor-and-technical-gorpcore')
    expect(slugify('  Y2K & Vintage  ')).toBe('y2k-and-vintage')
  })
})
