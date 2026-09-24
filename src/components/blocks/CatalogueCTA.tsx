import Link from 'next/link'

import { Crown, Drip, Sparkle } from '@/components/brand/Graphics'
import { Button } from '@/components/ui'

export function CatalogueCTA() {
  return (
    <section className="container-site py-8">
      <div className="relative grid gap-4 overflow-hidden rounded-lg border-2 border-ink bg-brand-yellow p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
        <Drip tone="black" className="absolute inset-x-0 top-0 h-6 w-full rotate-180" />
        <Sparkle tone="blue" className="absolute right-6 top-10 w-8" />
        <div className="relative grid gap-2 pt-4">
          <Crown className="w-14" />
          <h2 className="text-4xl md:text-5xl">The catalogue book</h2>
          <p className="max-w-xl text-lg">All 15 sections and every brand assortment. Download the PDF for your team or buyers.</p>
        </div>
        <Button asChild size="lg" className="relative border-2 border-ink bg-ink text-bg shadow-[4px_4px_0_0_var(--brand-blue)]">
          <Link href="/catalogue">Open the catalogue</Link>
        </Button>
      </div>
    </section>
  )
}
