import { cn } from '@/lib/utils'

export type StudioLogoVariant = 'intro' | 'header' | 'loader' | 'footer'

/**
 * 360 Thrift Studio logo.
 *
 * PLACEHOLDER: a typographic mark until the real files arrive
 * (studio-logo.svg ≤ 10 KB + studio-logo-intro.lottie ≤ 60 KB).
 * Build 4 swaps in the SVG and lazy-loads the dotLottie player for
 * `intro` / `footer`; `header` gets a 400 ms hover micro-animation.
 */
export function StudioLogo({
  variant = 'header',
  className,
}: {
  variant?: StudioLogoVariant
  className?: string
}) {
  return (
    <span
      data-variant={variant}
      className={cn(
        'studio-logo inline-flex items-baseline gap-1.5 font-display leading-none tracking-tight text-ink',
        variant === 'footer' ? 'text-3xl' : 'text-xl',
        className,
      )}
    >
      <span className="font-black">360</span>
      <span className="font-semibold uppercase">Thrift Studio</span>
    </span>
  )
}
