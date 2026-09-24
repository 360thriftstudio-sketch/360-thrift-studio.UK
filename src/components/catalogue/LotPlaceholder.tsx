import { Crown, Sparkle, Splatter } from '@/components/brand/Graphics'
import { cn } from '@/lib/utils'

const TONES = ['yellow', 'blue', 'green'] as const

/** Branded stand-in until the lot's own stock photos are uploaded. */
export function LotPlaceholder({ label, seed = 0, className }: { label: string; seed?: number; className?: string }) {
  const tone = TONES[seed % TONES.length]
  return (
    <div aria-hidden className={cn('absolute inset-0 grid place-items-center overflow-hidden bg-brand-cream', className)}>
      <Splatter tone={tone} className="absolute -right-6 -top-4 w-2/3 opacity-90" />
      <Splatter tone={TONES[(seed + 1) % 3]} className="absolute -bottom-6 -left-8 w-1/2 opacity-80" />
      <Sparkle tone="black" className="absolute left-5 top-6 w-5" />
      <div className="relative grid justify-items-center gap-1 px-4 text-center">
        <Crown className="w-10" />
        <span className="font-display text-2xl leading-none text-ink uppercase">{label}</span>
        <span className="rounded-sm bg-surface/90 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
          Photos coming soon
        </span>
      </div>
    </div>
  )
}
