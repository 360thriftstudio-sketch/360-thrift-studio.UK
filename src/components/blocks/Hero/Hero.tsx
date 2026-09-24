import Link from 'next/link'

import { Button } from '@/components/ui'

/**
 * Home hero. Build 4 adds the warehouse video/photo (16:9 desktop, 4:5 mobile,
 * fetchpriority=high) and the once-per-session StudioLogo intro over it.
 */
export function Hero({
  heading,
  subheading,
}: {
  heading: string
  subheading: string
}) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="container-site grid gap-6 py-16 md:py-24">
        <h1 className="max-w-4xl text-[length:var(--text-hero)] uppercase">{heading}</h1>
        <p className="max-w-2xl text-lg text-ink-muted">{subheading}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/shop">Browse the catalogue</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/trade-account">Open a trade account</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
