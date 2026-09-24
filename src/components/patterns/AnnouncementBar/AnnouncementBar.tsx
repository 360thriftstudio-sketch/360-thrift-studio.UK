import Link from 'next/link'

import { Sparkle } from '@/components/brand/Graphics'

export function AnnouncementBar({ text, href }: { text: string; href?: string }) {
  return (
    <div className="bg-ink text-bg">
      <p className="container-site flex items-center justify-center gap-2 py-2 text-center text-sm font-semibold tracking-wide">
        <Sparkle tone="yellow" className="size-3.5 shrink-0" />
        {href ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
        <Sparkle tone="green" className="size-3.5 shrink-0" />
      </p>
    </div>
  )
}
