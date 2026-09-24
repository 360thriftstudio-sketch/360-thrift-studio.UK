import Link from 'next/link'
import type { ReactNode } from 'react'

import { Crown } from '@/components/brand/Graphics'

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-ink/30 bg-surface px-6 py-14 text-center">
      <Crown className="w-14" />
      <p className="font-display text-2xl uppercase">{title}</p>
      {children ? <div className="max-w-md text-ink-muted">{children}</div> : null}
      {action ? (
        <Link href={action.href} className="font-semibold text-accent underline underline-offset-2">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
