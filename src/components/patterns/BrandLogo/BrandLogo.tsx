import { brandLogoAlt, type BrandLogoMode } from '@/lib/brand-logos'
import { cn } from '@/lib/utils'

/**
 * Stocked-brand mark. `mode` must come from lib/brand-logos#brandLogoMode, which
 * enforces SHOW_BRAND_LOGOS + per-brand logoApproved. The mark itself is never
 * animated, recoloured or altered — animate the container instead.
 */
export function BrandLogo({
  name,
  mode,
  logoUrl,
  className,
}: {
  name: string
  mode: BrandLogoMode
  logoUrl?: string
  className?: string
}) {
  if (mode === 'logo' && logoUrl) {
    return (
      // Plain <img>: SVGs are served as-is, never processed or recoloured.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={brandLogoAlt(name)} className={cn('h-6 w-auto md:h-8', className)} />
    )
  }
  return (
    <span
      data-mode="wordmark"
      className={cn('font-display text-base font-bold uppercase tracking-wide text-ink', className)}
    >
      {name}
    </span>
  )
}
