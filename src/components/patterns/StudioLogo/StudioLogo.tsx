import Image from 'next/image'

import { cn } from '@/lib/utils'

export type StudioLogoVariant = 'intro' | 'header' | 'loader' | 'footer'

const SIZES: Record<StudioLogoVariant, number> = { header: 60, loader: 96, intro: 280, footer: 150 }

/**
 * 360 Thrift Studio logo (from the brand board).
 * Raster for now; swap `src` for studio-logo.svg (≤ 10 KB) when the vector
 * arrives. Build 4 lazy-loads the dotLottie intro/footer animations.
 * The header mark gets a 400 ms hover wiggle (none under reduced motion).
 */
export function StudioLogo({
  variant = 'header',
  className,
  priority,
}: {
  variant?: StudioLogoVariant
  className?: string
  priority?: boolean
}) {
  const h = SIZES[variant]
  const w = Math.round(h * (370 / 395))
  return (
    <Image
      src="/brand/studio-logo-mark.webp"
      alt="360 Thrift Studio"
      width={w}
      height={h}
      priority={priority}
      data-variant={variant}
      className={cn('studio-logo h-auto select-none', className)}
      style={{ width: w }}
    />
  )
}
