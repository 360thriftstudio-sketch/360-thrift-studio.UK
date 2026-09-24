import { Sparkle } from '@/components/brand/Graphics'

export type TrustItem = { label: string; value: string }

/** Short, provable facts only (CMS Settings → Trust strip). */
export function TrustStrip({ items }: { items: TrustItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Why buyers trust us" className="border-b-2 border-ink bg-ink text-bg">
      <ul className="container-site grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-3">
            <Sparkle tone={(['yellow', 'green', 'blue', 'yellow'] as const)[i % 4]} className="size-6 shrink-0" />
            <span className="grid">
              <span className="font-display text-3xl leading-none text-brand-yellow">{item.value}</span>
              <span className="text-sm text-bg/80">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
