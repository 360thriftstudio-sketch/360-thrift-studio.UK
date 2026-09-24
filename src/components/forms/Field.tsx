'use client'

import { AlertCircle } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const control =
  'w-full rounded-md border-2 border-ink/70 bg-surface px-3 text-base outline-none transition-colors focus:border-ink aria-[invalid=true]:border-error'

type Base = { name: string; label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string }

function Wrap({ name, label, error, hint, optional, className, children }: Base & { children: ReactNode }) {
  return (
    <div className={cn('grid gap-1', className)}>
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label} {optional ? <span className="font-normal text-ink-muted">(optional)</span> : null}
      </label>
      {hint ? <p id={`h-${name}`} className="text-xs text-ink-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p id={`e-${name}`} className="flex items-center gap-1 text-sm font-semibold text-error">
          <AlertCircle aria-hidden className="size-4" /> {error}
        </p>
      ) : null}
    </div>
  )
}

const describedBy = (name: string, error?: string, hint?: ReactNode) =>
  [hint ? `h-${name}` : null, error ? `e-${name}` : null].filter(Boolean).join(' ') || undefined

export function TextField({ name, label, error, hint, optional, className, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap {...{ name, label, error, hint, optional, className }}>
      <input
        id={`f-${name}`}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={cn(control, 'min-h-11')}
        {...rest}
      />
    </Wrap>
  )
}

export function TextArea({ name, label, error, hint, optional, className, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap {...{ name, label, error, hint, optional, className }}>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={cn(control, 'py-2')}
        {...rest}
      />
    </Wrap>
  )
}

export function SelectField({
  name, label, error, hint, optional, className, options, placeholder, ...rest
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Wrap {...{ name, label, error, hint, optional, className }}>
      <select
        id={`f-${name}`}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={cn(control, 'min-h-11')}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrap>
  )
}

/** Summary at the top of the form on submit; each item links to its field. */
export function ErrorSummary({ errors, labels }: { errors: Record<string, string>; labels: Record<string, string> }) {
  const entries = Object.entries(errors)
  if (!entries.length) return null
  return (
    <div role="alert" tabIndex={-1} className="rounded-md border-2 border-error bg-surface p-4" id="error-summary">
      <p className="mb-2 font-bold text-error">There {entries.length === 1 ? 'is a problem' : `are ${entries.length} problems`}</p>
      <ul className="grid gap-1 text-sm">
        {entries.map(([k, v]) => (
          <li key={k}>
            <a href={`#f-${k.split('.').pop()}`} className="font-semibold text-error underline underline-offset-2">
              {labels[k.split('.').pop() ?? k] ?? k}: {v}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Hidden from people, tempting to bots. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )
}
