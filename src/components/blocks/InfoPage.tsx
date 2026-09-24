import { RichText } from '@payloadcms/richtext-lexical/react'
import type { ReactNode } from 'react'

import { Sparkle, Stroke } from '@/components/brand/Graphics'
import { Breadcrumbs } from '@/components/patterns'
import type { NavLink } from '@/lib/nav-types'
import type { Page } from '@/payload-types'

/** Blank line = paragraph; "- " lines = list. */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i} className="grid list-disc gap-1 pl-5">
              {lines.map((l) => <li key={l}>{l.trim().slice(2)}</li>)}
            </ul>
          )
        }
        return <p key={i}>{block}</p>
      })}
    </>
  )
}

export function InfoPage({ page, breadcrumbs, children }: { page: Page; breadcrumbs: NavLink[]; children?: ReactNode }) {
  return (
    <article className="container-site grid gap-6 py-6">
      <Breadcrumbs items={breadcrumbs} />
      <header className="relative grid max-w-3xl gap-3">
        <Sparkle tone="green" className="absolute -left-2 -top-4 w-6" />
        <h1 className="text-5xl">{page.title}</h1>
        <Stroke className="h-3 w-40 text-brand-yellow" />
        {page.intro ? <p className="text-lg text-ink-muted">{page.intro}</p> : null}
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid max-w-3xl content-start gap-6">
          {(page.sections ?? []).map((s) => (
            <section key={s.id ?? s.heading} className="grid gap-2">
              {s.heading ? <h2 className="text-2xl">{s.heading}</h2> : null}
              {s.body ? <div className="grid gap-3 leading-relaxed"><Body text={s.body} /></div> : null}
            </section>
          ))}
          {page.content ? <div className="grid gap-3"><RichText data={page.content} /></div> : null}
        </div>
        {children ? <aside className="self-start">{children}</aside> : null}
      </div>
    </article>
  )
}
