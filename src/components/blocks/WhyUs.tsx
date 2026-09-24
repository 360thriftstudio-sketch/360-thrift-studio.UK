import { Check, Minus } from 'lucide-react'

const ROWS: [string, string][] = [
  ['Grade stated on every lot', 'Cream / A / B / Mixed, with a public grading guide'],
  ['Pieces and weight stated', 'Every lot page shows piece count and kg'],
  ['Brand mix counts', 'Mixed lots list each brand and its count'],
  ['Guide prices by quantity', 'Tier table updates live as you change quantity'],
  ['Quote before you pay', 'No card at checkout — we send a quote and invoice'],
  ['Stock held while we quote', 'Lots are soft-reserved for 48 hours'],
  ['Verified era only when proven', '“Verified vintage / Y2K” only when labels and construction confirm it'],
]

/** Only provable claims about our own process. */
export function WhyUs() {
  return (
    <section aria-labelledby="why" className="container-site py-16">
      <h2 id="why" className="mb-6 text-4xl md:text-5xl">Why buy from us</h2>
      <div className="overflow-x-auto rounded-lg border-2 border-ink bg-surface">
        <table className="w-full text-left text-sm md:text-base">
          <caption className="sr-only">What every 360° Thrift Studio lot includes</caption>
          <thead className="bg-ink text-bg">
            <tr>
              <th scope="col" className="px-4 py-3 font-display text-lg uppercase tracking-wide">What you get</th>
              <th scope="col" className="px-4 py-3 font-display text-lg uppercase tracking-wide">How</th>
              <th scope="col" className="px-4 py-3 text-center font-display text-lg uppercase tracking-wide">360°</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([what, how]) => (
              <tr key={what} className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-bold">{what}</th>
                <td className="px-4 py-3 text-ink-muted">{how}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex size-7 items-center justify-center rounded-pill border-2 border-ink bg-brand-green">
                    <Check aria-hidden className="size-4" /><span className="sr-only">Yes</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted"><Minus aria-hidden className="size-3" /> Claims describe our own process; no comparison with named competitors.</p>
    </section>
  )
}
