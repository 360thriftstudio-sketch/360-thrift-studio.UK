'use client'

import { useCallback, useState } from 'react'
import type { z } from 'zod'

import { fieldErrors } from '@/lib/schemas'

/**
 * Minimal form state on top of a zod schema: validate on blur, then on change
 * once touched; full validation + error summary on submit.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(schema: S, initial: Record<string, string>) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showSummary, setShowSummary] = useState(false)

  const validateField = useCallback(
    (name: string, next: Record<string, string>) => {
      const res = schema.safeParse(next)
      const all = res.success ? {} : fieldErrors(res.error)
      setErrors((e) => {
        const out = { ...e }
        if (all[name]) out[name] = all[name]
        else delete out[name]
        return out
      })
    },
    [schema],
  )

  const bind = (name: string) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (e: { target: { value: string } }) => {
      const next = { ...values, [name]: e.target.value }
      setValues(next)
      if (touched[name]) validateField(name, next)
    },
    onBlur: () => {
      setTouched((t) => ({ ...t, [name]: true }))
      validateField(name, values)
    },
  })

  const validateAll = (): z.infer<S> | null => {
    const res = schema.safeParse(values)
    if (res.success) {
      setErrors({})
      setShowSummary(false)
      return res.data
    }
    setErrors(fieldErrors(res.error))
    setShowSummary(true)
    requestAnimationFrame(() => document.getElementById('error-summary')?.focus())
    return null
  }

  return { values, setValues, errors, setErrors, bind, validateAll, showSummary }
}
