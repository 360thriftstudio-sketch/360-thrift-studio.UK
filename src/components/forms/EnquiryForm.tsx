'use client'

import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { Button } from '@/components/ui'
import type { ENQUIRY_TYPES } from '@/lib/schemas'

import { ErrorSummary, Honeypot, SelectField, TextArea, TextField } from './Field'
import { useZodForm } from './useForm'

type FieldDef = {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date'
  required?: boolean
  autoComplete?: string
  options?: { value: string; label: string }[]
  hint?: string
  wide?: boolean
}

const CORE = new Set(['name', 'email', 'company', 'phone', 'country', 'message'])

/** Generic enquiry form (trade account, luxury request, contact, visit, newsletter). */
export function EnquiryForm({
  type,
  fields,
  submitLabel,
  success,
  draftKey,
}: {
  type: (typeof ENQUIRY_TYPES)[number]
  fields: FieldDef[]
  submitLabel: string
  success: string
  draftKey?: string
}) {
  const schema = z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.type === 'email'
          ? z.string().trim().email('Enter an email address like name@company.com')
          : f.required
            ? z.string().trim().min(1, `Enter ${f.label.toLowerCase()}`)
            : z.string().optional(),
      ]),
    ),
  )
  const f = useZodForm(schema, Object.fromEntries(fields.map((x) => [x.name, ''])))
  const { setValues } = f
  // Restore a saved draft after mount (long forms save as drafts).
  useEffect(() => {
    if (!draftKey) return
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? '{}') as Record<string, string>
      if (Object.keys(saved).length) setValues((v) => ({ ...v, ...saved }))
    } catch {
      // storage unavailable
    }
  }, [draftKey, setValues])
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const labels = Object.fromEntries(fields.map((x) => [x.name, x.label]))

  if (state === 'done') {
    return (
      <div role="status" className="grid gap-2 rounded-lg border-2 border-ink bg-brand-green/20 p-6">
        <CheckCircle2 aria-hidden className="size-8 text-success" />
        <p className="font-display text-2xl uppercase">Thanks — we’ve got it</p>
        <p>{success}</p>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="relative grid gap-4 sm:grid-cols-2"
      onChange={() => {
        if (draftKey) {
          try {
            localStorage.setItem(draftKey, JSON.stringify(f.values))
          } catch {
            // ignore
          }
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault()
        const data = f.validateAll()
        if (!data) return
        setState('busy')
        const website = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value ?? ''
        const core = Object.fromEntries(Object.entries(data).filter(([k]) => CORE.has(k)))
        const extra = Object.fromEntries(Object.entries(data).filter(([k, v]) => !CORE.has(k) && v))
        const res = await fetch('/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, ...core, fields: extra, website }),
        }).catch(() => null)
        if (res?.ok) {
          setState('done')
          if (draftKey) localStorage.removeItem(draftKey)
        } else {
          setState('error')
        }
      }}
    >
      <Honeypot />
      {f.showSummary ? <div className="sm:col-span-2"><ErrorSummary errors={f.errors} labels={labels} /></div> : null}
      {state === 'error' ? (
        <p role="alert" className="rounded-md bg-error/10 p-3 text-sm font-semibold text-error sm:col-span-2">
          That didn’t go through. Check your connection and try again — your answers are saved.
        </p>
      ) : null}
      {fields.map((d) => {
        const common = { label: d.label, optional: !d.required && d.type !== 'email', hint: d.hint, className: d.wide || d.type === 'textarea' ? 'sm:col-span-2' : undefined, ...f.bind(d.name) }
        if (d.type === 'textarea') return <TextArea key={d.name} {...common} />
        if (d.type === 'select') return <SelectField key={d.name} {...common} options={d.options ?? []} placeholder="Choose…" />
        return <TextField key={d.name} type={d.type ?? 'text'} autoComplete={d.autoComplete} {...common} />
      })}
      <Button type="submit" size="lg" loading={state === 'busy'} className="sm:col-span-2 sm:w-fit">
        {submitLabel}
      </Button>
    </form>
  )
}
