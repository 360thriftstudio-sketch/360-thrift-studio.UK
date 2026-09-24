import Link from 'next/link'

import { Arrow, Sparkle, Splatter, Stroke } from '@/components/brand/Graphics'
import { Button } from '@/components/ui'

import { HeroIntro } from '../HeroIntro'

/** Home hero. Warehouse video/photo slot comes in Build 4; logo intro plays once per session. */
export function Hero({ heading, subheading, slogan }: { heading: string; subheading: string; slogan: string }) {
  return (
    <section className="relative overflow-hidden border-b-2 border-ink bg-brand-cream">
      <Splatter tone="yellow" className="pointer-events-none absolute -left-24 -top-16 w-96 opacity-80" />
      <Splatter tone="blue" className="pointer-events-none absolute -bottom-20 right-1/3 w-72 opacity-60" />
      <Splatter tone="green" className="pointer-events-none absolute -right-20 top-10 w-80 opacity-70" />
      <div className="container-site relative grid items-center gap-8 py-12 md:py-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-5">
          <p className="font-marker text-xl text-brand-blue md:text-2xl">{slogan}</p>
          <h1 className="max-w-3xl text-[length:var(--text-hero)] leading-[0.95]">{heading}</h1>
          <Stroke className="-mt-2 h-4 w-56 text-brand-green" />
          <p className="max-w-xl text-lg">{subheading}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="border-2 border-ink shadow-[4px_4px_0_0_var(--brand-black)]">
              <Link href="/shop">Browse the catalogue</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="border-2 border-ink bg-brand-yellow shadow-[4px_4px_0_0_var(--brand-black)]">
              <Link href="/trade-account">Open a trade account</Link>
            </Button>
            <Arrow className="hidden w-20 -rotate-12 sm:block" />
          </div>
          <p className="font-display text-lg uppercase tracking-wide">Vintage · Premium · Wholesale</p>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <Sparkle tone="blue" className="absolute -left-4 top-6 z-10 w-10" />
          <Sparkle tone="green" className="absolute -right-2 bottom-10 z-10 w-8" />
          <HeroIntro />
        </div>
      </div>
    </section>
  )
}
