const STEPS = [
  { title: 'Browse', body: 'Filter by section, brand, style and grade. Every lot shows pieces, weight and grade.' },
  { title: 'Add to quote', body: 'Add lots and quantities to your quote basket. Guide prices update by quantity.' },
  { title: 'Get your quote', body: 'Send one request. We reply with a quote and invoice within 1 working day.' },
  { title: 'Pay & dispatch', body: 'Pay by bank transfer or card link. We dispatch within 24 hours of payment.' },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-y border-line bg-surface">
      <div className="container-site py-16">
        <h2 id="how-heading" className="mb-8 text-2xl">
          How it works
        </h2>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid content-start gap-2">
              <span
                aria-hidden
                className="inline-flex size-10 items-center justify-center rounded-pill bg-accent font-bold text-accent-ink"
              >
                {i + 1}
              </span>
              <h3 className="text-xl">{step.title}</h3>
              <p className="text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
