export type TrustItem = { label: string; value: string }

/** Short, provable facts only (edited in CMS Settings → Trust strip). */
export function TrustStrip({ items }: { items: TrustItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Why buyers trust us" className="border-b border-line">
      <ul className="container-site grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="grid">
            <span className="font-display text-2xl font-extrabold">{item.value}</span>
            <span className="text-sm text-ink-muted">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
