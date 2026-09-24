'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { loginSchema, registerSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

import { ErrorSummary, TextField } from './Field'
import { useZodForm } from './useForm'

const LABELS: Record<string, string> = {
  email: 'Email', password: 'Password', company: 'Company', contactName: 'Your name', country: 'Country', phone: 'Phone', vatNumber: 'VAT / company no.',
}

/** Log in or create a trade buyer account (Payload `customers` auth, HTTP-only cookie). */
export function AuthPanel({ initial = 'login', onDone }: { initial?: 'login' | 'register'; onDone?: () => void }) {
  const [mode, setMode] = useState(initial)
  return (
    <div className="grid gap-4 rounded-lg border-2 border-ink bg-surface p-5">
      <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn('min-h-10 rounded-sm font-bold', mode === m ? 'bg-ink text-bg' : 'hover:bg-line/60')}
          >
            {m === 'login' ? 'Log in' : 'Create account'}
          </button>
        ))}
      </div>
      <div role="tabpanel">{mode === 'login' ? <LoginForm onDone={onDone} /> : <RegisterForm onDone={onDone} />}</div>
    </div>
  )
}

function useSubmit(onDone?: () => void) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (fn: () => Promise<Response>, fallback: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fn()
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { errors?: { message?: string }[] } | null
        setError(body?.errors?.[0]?.message || fallback)
        return false
      }
      router.refresh()
      onDone?.()
      return true
    } catch {
      setError('That didn’t go through. Check your connection and try again.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

const login = (email: string, password: string) =>
  fetch('/api/customers/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

function LoginForm({ onDone }: { onDone?: () => void }) {
  const f = useZodForm(loginSchema, { email: '', password: '' })
  const { busy, error, run } = useSubmit(onDone)
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        const data = f.validateAll()
        if (data) await run(() => login(data.email, data.password), 'Email or password is incorrect.')
      }}
    >
      {f.showSummary ? <ErrorSummary errors={f.errors} labels={LABELS} /> : null}
      {error ? <p role="alert" className="rounded-md bg-error/10 p-3 text-sm font-semibold text-error">{error}</p> : null}
      <TextField label="Email" type="email" autoComplete="email" {...f.bind('email')} />
      <TextField label="Password" type="password" autoComplete="current-password" {...f.bind('password')} />
      <Button type="submit" loading={busy}>Log in</Button>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone?: () => void }) {
  const f = useZodForm(registerSchema, { company: '', contactName: '', email: '', password: '', country: 'United Kingdom', phone: '', vatNumber: '' })
  const { busy, error, run } = useSubmit(onDone)
  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const data = f.validateAll()
        if (!data) return
        await run(async () => {
          const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          return res.ok ? login(data.email, data.password) : res
        }, 'We couldn’t create that account. You may already have one — try logging in.')
      }}
    >
      {f.showSummary ? <div className="sm:col-span-2"><ErrorSummary errors={f.errors} labels={LABELS} /></div> : null}
      {error ? <p role="alert" className="rounded-md bg-error/10 p-3 text-sm font-semibold text-error sm:col-span-2">{error}</p> : null}
      <TextField label="Company" autoComplete="organization" {...f.bind('company')} />
      <TextField label="Your name" autoComplete="name" {...f.bind('contactName')} />
      <TextField label="Email" type="email" autoComplete="email" {...f.bind('email')} />
      <TextField label="Password" type="password" autoComplete="new-password" hint="At least 10 characters." {...f.bind('password')} />
      <TextField label="Country" autoComplete="country-name" {...f.bind('country')} />
      <TextField label="Phone" type="tel" autoComplete="tel" optional {...f.bind('phone')} />
      <TextField label="VAT / company no." optional className="sm:col-span-2" {...f.bind('vatNumber')} />
      <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button>
      <p className="text-xs text-ink-muted sm:col-span-2">Trade prices unlock after a quick account check.</p>
    </form>
  )
}
