import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const chip =
  'inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-sm ' +
  'transition-colors duration-[var(--dur-fast)] hover:border-ink ' +
  'data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:text-bg'

export function Chip({
  children,
  href,
  selected,
  className,
}: {
  children: ReactNode
  href?: string
  selected?: boolean
  className?: string
}) {
  if (href) {
    return (
      <Link
        href={href}
        data-selected={selected || undefined}
        aria-current={selected ? 'page' : undefined}
        className={cn(chip, className)}
      >
        {children}
      </Link>
    )
  }
  return (
    <span data-selected={selected || undefined} className={cn(chip, className)}>
      {children}
    </span>
  )
}
