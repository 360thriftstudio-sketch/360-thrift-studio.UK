/** Horizontal bars of brand (or garment) counts, with the table as the accessible source. */
export function MixBreakdownChart({ items, unit = 'pcs' }: { items: { label: string; count: number }[]; unit?: string }) {
  const data = items.filter((i) => i.count > 0)
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.count))
  const total = data.reduce((n, d) => n + d.count, 0)
  const colours = ['var(--brand-blue)', 'var(--brand-yellow)', 'var(--brand-green)', 'var(--brand-black)']
  return (
    <figure className="grid gap-3">
      <div aria-hidden className="grid gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="grid grid-cols-[minmax(90px,160px)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="h-4 overflow-hidden rounded-pill bg-line">
              <span className="block h-full rounded-pill border border-ink" style={{ width: `${(d.count / max) * 100}%`, background: colours[i % colours.length] }} />
            </span>
            <span className="tabular-nums text-ink-muted">{d.count}</span>
          </div>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Show as table</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Mix breakdown</caption>
          <thead>
            <tr className="text-left"><th scope="col">Brand</th><th scope="col">Count ({unit})</th><th scope="col">Share</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line">
                <td>{d.label}</td><td>{d.count}</td><td>{Math.round((d.count / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <figcaption className="text-xs text-ink-muted">Total {total} {unit}. Counts are stated per lot.</figcaption>
    </figure>
  )
}
