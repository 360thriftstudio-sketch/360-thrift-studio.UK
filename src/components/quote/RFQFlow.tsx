'use client'
import type { ReactNode } from 'react'

import { Check, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Crown, Sparkle } from '@/components/brand/Graphics'
import { AuthPanel } from '@/components/forms/AuthPanel'
import { ErrorSummary, SelectField, TextArea, TextField } from '@/components/forms/Field'
import { useZodForm } from '@/components/forms/useForm'
import { Button, QuantityStepper } from '@/components/ui'
import { basket, useBasket } from '@/lib/basket-store'
import { basketTotal, formatPence, priceAccess, priceLine } from '@/lib/pricing'
import { PAYMENT_PREFS, rfqDetailsSchema, SHIPPING_METHODS, vatLooksValid } from '@/lib/schemas'
import { cn } from '@/lib/utils'

import { useViewer } from './ViewerContext'

const STEPS = ['Basket', 'Details', 'Review', 'Sent'] as const
const DRAFT_KEY = 'thrift360.rfqDetails.v1'
const LABELS: Record<string, string> = {
  company: 'Company', contactName: 'Contact name', email: 'Email', phone: 'Phone', vatNumber: 'VAT / company no.',
  country: 'Country', postcode: 'Delivery postcode', shippingMethod: 'Shipping method', paymentPreference: 'Payment preference', deadline: 'Deadline',
}

export type RFQPrefill = Record<string, string>

/** Basket → Details → Review → Sent. The quote is the checkout. */
export function RFQFlow({ prefill, whatsapp }: { prefill: RFQPrefill; whatsapp?: string | null }) {
  const { lines, hydrated } = useBasket()
  const viewer = useViewer()
  const [step, setStep] = useState(0)
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState<{ ref: string } | null>(null)

  const f = useZodForm(rfqDetailsSchema, {
    company: '', contactName: '', email: '', phone: '', vatNumber: '', country: 'United Kingdom', postcode: '',
    shippingMethod: '', paymentPreference: 'bank-transfer', deadline: '', ...prefill,
  })
  const { setValues, values } = f

  // Restore / save the details draft (long forms save as drafts).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, string>
      if (Object.keys(saved).length) setValues((v) => ({ ...v, ...saved, ...Object.fromEntries(Object.entries(prefill).filter(([, x]) => x)) }))
    } catch {
      // storage unavailable
    }
  }, [prefill, setValues])
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(values))
    } catch {
      // ignore
    }
  }, [values])

  const priced = lines.map((l) => {
    const visible = priceAccess(l.priceVisibility, viewer, viewer.requireLoginForPrices) === 'visible'
    return { line: l, price: visible ? priceLine({ tiers: l.tiers, qty: l.qty, weightKg: l.weightKg, pieces: l.pieces }) : null }
  })
  const total = basketTotal(priced.map((p) => p.price ?? { perLotPence: null, subtotalPence: null, quoteOnly: true, savingPercent: 0 }))

  const goto = (n: number) => {
    setStep(n)
    requestAnimationFrame(() => document.getElementById('rfq-step')?.focus())
  }

  const submit = async () => {
    if (!consent) {
      setConsentError('Tick to confirm we can contact you about this quote')
      return
    }
    const details = f.validateAll()
    if (!details) return goto(1)
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/rfq', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: lines.map((l) => ({ lotId: l.lotId, qty: l.qty })), details, notes, consent: true }),
      })
      const body = (await res.json().catch(() => ({}))) as { ref?: string; error?: string; fields?: Record<string, string> }
      if (!res.ok || !body.ref) {
        if (body.fields) f.setErrors(Object.fromEntries(Object.entries(body.fields).map(([k, v]) => [k.replace('details.', ''), v])))
        setSendError(body.error || 'That didn’t go through. Check your connection and try again — your basket is saved.')
        return
      }
      setSent({ ref: body.ref })
      basket.clear()
      localStorage.removeItem(DRAFT_KEY)
      goto(3)
    } catch {
      setSendError('That didn’t go through. Check your connection and try again — your basket is saved.')
    } finally {
      setSending(false)
    }
  }

  const stepper = (
    <ol className="grid grid-cols-4 gap-2" aria-label="Quote request progress">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === step ? 'step' : undefined} className="grid gap-1 text-center">
          <span
            className={cn(
              'mx-auto inline-flex size-9 items-center justify-center rounded-pill border-2 border-ink font-bold',
              i < step ? 'bg-brand-green' : i === step ? 'bg-brand-yellow' : 'bg-surface',
            )}
          >
            {i < step ? <Check aria-hidden className="size-4" /> : i + 1}
          </span>
          <span className={cn('text-xs font-semibold sm:text-sm', i === step ? 'text-ink' : 'text-ink-muted')}>
            {s}
            <span className="sr-only">{i < step ? ' (done)' : i === step ? ' (current step)' : ''}</span>
          </span>
        </li>
      ))}
    </ol>
  )

  if (!hydrated) return <div className="skeleton h-96 rounded-lg" aria-hidden />

  return (
    <div className="grid gap-6">
      {stepper}
      <div id="rfq-step" tabIndex={-1} className="outline-none">
        {step === 0 ? (
          lines.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-ink/30 bg-surface p-10 text-center">
              <Crown className="w-16" />
              <h2 className="text-3xl">Your basket is empty</h2>
              <p className="text-ink-muted">Add lots to build a quote — no payment needed.</p>
              <Button asChild><Link href="/shop">Browse the catalogue</Link></Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="grid gap-4">
                <h2 className="text-3xl">1. Your basket</h2>
                <ul className="divide-y divide-line rounded-lg border-2 border-ink bg-surface">
                  {priced.map(({ line, price }) => (
                    <li key={line.lotId} className="grid grid-cols-[72px_1fr] gap-4 p-4 sm:grid-cols-[88px_1fr_auto]">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-bg">
                        {line.image ? <Image src={line.image} alt="" fill sizes="88px" className="object-cover" /> : <div aria-hidden className="bg-splatter absolute inset-0 opacity-60" />}
                      </div>
                      <div className="grid content-start gap-1">
                        <Link href={`/lot/${line.slug}`} className="font-semibold hover:underline">{line.title}</Link>
                        <p className="text-xs text-ink-muted">SKU {line.sku}{price?.tier ? ` · band ${price.tier.minQty}${price.tier.maxQty ? `–${price.tier.maxQty}` : '+'}` : ''}</p>
                        <button type="button" onClick={() => basket.remove(line.lotId)} className="w-fit text-xs text-ink-muted underline hover:text-error">Remove</button>
                      </div>
                      <div className="col-span-2 flex items-end justify-between gap-4 sm:col-span-1 sm:grid sm:justify-items-end">
                        <QuantityStepper size="sm" label={`Quantity for ${line.title}`} value={line.qty} min={Math.max(1, line.moq ?? 1)} max={line.maxQty && line.maxQty > 0 ? line.maxQty : 999} onChange={(q) => basket.setQty(line.lotId, q)} />
                        <p className="font-bold">{price?.subtotalPence != null ? formatPence(price.subtotalPence) : 'Quote'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <TextArea name="notes" label="Notes for our team" optional hint="Sizes, mix preferences, photos you’d like to see…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Summary total={total.guideTotalPence} partial={total.hasQuoteOnlyLines} count={lines.length}>
                <Button size="lg" className="w-full" onClick={() => goto(1)}>Continue to details</Button>
              </Summary>
            </div>
          )
        ) : null}

        {step === 1 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid content-start gap-4">
              <h2 className="text-3xl">2. Your details</h2>
              {!viewer.loggedIn ? (
                <div className="grid gap-3">
                  <p className="rounded-md bg-brand-yellow p-3 text-sm font-semibold">
                    Log in or create a free trade account to send your request. Your basket is saved.
                  </p>
                  <AuthPanel initial="register" />
                </div>
              ) : (
                <form
                  noValidate
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (f.validateAll()) goto(2)
                  }}
                >
                  {f.showSummary ? <div className="sm:col-span-2"><ErrorSummary errors={f.errors} labels={LABELS} /></div> : null}
                  <TextField label="Company" autoComplete="organization" {...f.bind('company')} />
                  <TextField label="Contact name" autoComplete="name" {...f.bind('contactName')} />
                  <TextField label="Email" type="email" autoComplete="email" {...f.bind('email')} />
                  <TextField label="Phone" type="tel" autoComplete="tel" optional {...f.bind('phone')} />
                  <TextField
                    label="VAT / company no."
                    optional
                    hint={values.vatNumber && !vatLooksValid(values.vatNumber) ? '⚠ That doesn’t look like a VAT number — check it, or continue anyway.' : undefined}
                    {...f.bind('vatNumber')}
                  />
                  <TextField label="Country" autoComplete="country-name" {...f.bind('country')} />
                  <TextField label="Delivery postcode" autoComplete="postal-code" optional {...f.bind('postcode')} />
                  <TextField label="Deadline" type="date" optional {...f.bind('deadline')} />
                  <SelectField label="Shipping method" options={SHIPPING_METHODS} placeholder="Choose…" {...f.bind('shippingMethod')} />
                  <SelectField label="Payment preference" options={PAYMENT_PREFS} {...f.bind('paymentPreference')} />
                  <div className="flex gap-3 sm:col-span-2">
                    <Button type="button" variant="secondary" className="border-2 border-ink" onClick={() => goto(0)}>Back</Button>
                    <Button type="submit">Review request</Button>
                  </div>
                </form>
              )}
            </div>
            <Summary total={total.guideTotalPence} partial={total.hasQuoteOnlyLines} count={lines.length} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid content-start gap-4">
              <h2 className="text-3xl">3. Review &amp; send</h2>
              <section className="rounded-lg border-2 border-ink bg-surface p-4">
                <h3 className="mb-2 font-body text-base font-bold normal-case tracking-normal">Lots</h3>
                <ul className="grid gap-1 text-sm">
                  {priced.map(({ line, price }) => (
                    <li key={line.lotId} className="flex justify-between gap-3">
                      <span>{line.qty} × {line.title}</span>
                      <span className="font-semibold">{price?.subtotalPence != null ? formatPence(price.subtotalPence) : 'Quote'}</span>
                    </li>
                  ))}
                </ul>
                {notes ? <p className="mt-3 text-sm"><span className="font-semibold">Notes:</span> {notes}</p> : null}
              </section>
              <section className="rounded-lg border-2 border-ink bg-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-body text-base font-bold normal-case tracking-normal">Details</h3>
                  <button type="button" className="text-sm font-semibold text-accent underline" onClick={() => goto(1)}>Edit</button>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {Object.entries(LABELS).filter(([k]) => values[k]).map(([k, label]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-muted">{label}</dt>
                      <dd className="font-semibold">
                        {k === 'shippingMethod' ? SHIPPING_METHODS.find((s) => s.value === values[k])?.label : k === 'paymentPreference' ? PAYMENT_PREFS.find((s) => s.value === values[k])?.label : values[k]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <label className="flex items-start gap-3 rounded-md border-2 border-ink bg-surface p-4">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setConsentError('') }} className="mt-1 size-5 accent-[var(--brand-blue)]" aria-describedby={consentError ? 'consent-error' : undefined} />
                <span className="text-sm">
                  I’m buying for a business. Contact me about this quote. I’ve read the <Link href="/legal/terms" className="underline">terms of trade</Link> and <Link href="/legal/privacy" className="underline">privacy notice</Link>.
                </span>
              </label>
              {consentError ? <p id="consent-error" className="text-sm font-semibold text-error">{consentError}</p> : null}
              {sendError ? <p role="alert" className="rounded-md bg-error/10 p-3 text-sm font-semibold text-error">{sendError}</p> : null}
              <div className="flex gap-3">
                <Button variant="secondary" className="border-2 border-ink" onClick={() => goto(1)}>Back</Button>
                <Button size="lg" loading={sending} onClick={submit}>Send quote request</Button>
              </div>
            </div>
            <Summary total={total.guideTotalPence} partial={total.hasQuoteOnlyLines} count={lines.length} />
          </div>
        ) : null}

        {step === 3 && sent ? (
          <div className="relative grid justify-items-center gap-4 overflow-hidden rounded-lg border-2 border-ink bg-surface p-10 text-center">
            <Sparkle tone="green" className="absolute left-8 top-8 w-10" />
            <Sparkle tone="blue" className="absolute bottom-10 right-10 w-8" />
            <Crown className="w-20" />
            <h2 className="text-4xl">Request sent</h2>
            <p className="max-w-lg text-lg" role="status">
              Quote request <strong className="rounded-sm bg-brand-yellow px-1.5">{sent.ref}</strong> sent. We’ll reply within 1 working day, usually sooner. Your lots are held for 48 hours.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {whatsapp ? (
                <Button asChild variant="secondary" className="border-2 border-ink">
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I just sent quote request ${sent.ref}.`)}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden className="size-4" /> WhatsApp us
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="secondary" className="border-2 border-ink"><Link href="/account">View my quotes</Link></Button>
              <Button asChild><Link href="/shop">Continue browsing</Link></Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Summary({ total, partial, count, children }: { total: number; partial: boolean; count: number; children?: ReactNode }) {
  return (
    <aside className="grid content-start gap-3 self-start rounded-lg border-2 border-ink bg-brand-cream p-5 shadow-[6px_6px_0_0_var(--brand-black)] lg:sticky lg:top-[calc(var(--header-h)+16px)]">
      <p className="text-sm font-semibold">{count} {count === 1 ? 'lot' : 'lots'}</p>
      <p className="flex items-baseline justify-between">
        <span className="text-sm">Guide total</span>
        <span className="font-display text-3xl">{formatPence(total)}</span>
      </p>
      <p className="text-xs text-ink-muted">Excl. VAT &amp; shipping. {partial ? 'Some lots are priced on your quote. ' : ''}Final price on your quote.</p>
      {children}
      <ul className="grid gap-1 border-t border-line pt-3 text-xs">
        <li>✓ No payment now</li>
        <li>✓ Reply within 1 working day</li>
        <li>✓ Lots held for 48 h</li>
      </ul>
    </aside>
  )
}
