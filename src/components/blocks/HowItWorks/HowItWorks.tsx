import { Arrow, Crown } from '@/components/brand/Graphics'

const STEPS = [
  { title: 'Browse', body: 'Filter by section, brand, style and grade. Every lot shows pieces, weight and grade.' },
  { title: 'Add to quote', body: 'Add lots and quantities to your quote basket. Guide prices update by quantity.' },
  { title: 'Get your quote', body: 'Send one request. We reply with a quote and invoice within 1 working day.' },
  { title: 'Pay & dispatch', body: 'Pay by bank transfer or card link. We dispatch within 24 hours of payment.' },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-y-2 border-ink bg-surface">
      <div className="container-site py-16">
        <div className="mb-8 flex items-end gap-3">
          <h2 id="how-heading" className="text-4xl md:text-5xl">How it works</h2>
          <Crown className="mb-2 w-10" />
        </div>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative grid content-start gap-2 rounded-lg border-2 border-ink bg-brand-cream p-5">
              <span aria-hidden className="font-display text-6xl leading-none text-brand-blue">{i + 1}</span>
              <h3 className="text-2xl">{step.title}</h3>
              <p>{step.body}</p>
              {i < STEPS.length - 1 ? <Arrow className="absolute -right-8 top-6 z-10 hidden w-14 lg:block" /> : null}
            </li>
          ))}
        </ol>
        <p className="mt-6 font-semibold">No checkout. No card. The quote is the checkout.</p>
      </div>
    </section>
  )
}
