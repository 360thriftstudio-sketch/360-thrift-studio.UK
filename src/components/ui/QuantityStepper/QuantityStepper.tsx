'use client'

import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

/** Quantity of lots. Buttons + typed input; clamps to min/max. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  label = 'Quantity (lots)',
  hideLabel,
  size = 'md',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
  hideLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const id = useId()
  const clamp = (v: number) => Math.min(max, Math.max(min, Number.isFinite(v) ? Math.round(v) : min))
  const btn = cn(
    'inline-flex items-center justify-center hover:bg-line/60 disabled:opacity-40',
    size === 'sm' ? 'size-9' : 'size-11',
  )
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className={cn('text-sm font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="inline-flex w-fit items-center rounded-md border border-ink bg-surface">
        <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={value <= min}>
          <Minus aria-hidden className="size-4" />
          <span className="sr-only">Decrease</span>
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className={cn(
            'w-12 border-x border-line bg-transparent text-center font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
            size === 'sm' ? 'h-9' : 'h-11',
          )}
        />
        <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max}>
          <Plus aria-hidden className="size-4" />
          <span className="sr-only">Increase</span>
        </button>
      </div>
    </div>
  )
}
