/**
 * Stocked-brand logo guardrail.
 *
 * A third-party logo may render ONLY when BOTH the global SHOW_BRAND_LOGOS
 * switch (CMS Settings, default off) AND the brand's own `logoApproved` flag
 * are on, and an SVG exists. Everything else falls back to a text wordmark.
 */

export type BrandLogoInput = {
  logoApproved?: boolean | null
  wordmarkOnly?: boolean | null
  hasLogo: boolean
}

export type BrandLogoMode = 'logo' | 'wordmark'

export function brandLogoMode(showBrandLogos: boolean, brand: BrandLogoInput): BrandLogoMode {
  if (!showBrandLogos) return 'wordmark'
  if (!brand.logoApproved || brand.wordmarkOnly || !brand.hasLogo) return 'wordmark'
  return 'logo'
}

export const brandLogoAlt = (brandName: string): string => `${brandName} — view lots`

export const BRAND_DISCLAIMER =
  'Independent reseller of pre-owned goods. Not affiliated with or endorsed by any brand shown.'

export const brandPageDisclaimer = (brandName: string): string =>
  `Independent reseller — not affiliated with ${brandName}.`
