'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TextArea } from '@/components/forms/Field'
import { Button } from '@/components/ui'
import { basket, type BasketLine } from '@/lib/basket-store'
import type { QuoteStatus } from '@/lib/rfq'

/** Accept a quote, ask for a change, or duplicate it into the basket. */
export function QuoteActions({ quoteId, status, lines }: { quoteId: number; status: QuoteStatus; lines: BasketLine[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'accept' | 'revise' | null>(null)
  const [asking, setAsking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const act = async (action: 'accept' | 'revise') => {
    setBusy(action)
    setError('')
    const res = await fetch('/api/quote-action', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, action, message: message || undefined }),
    }).catch(() => null)
    setBusy(null)
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'That didn’t go through. Try again.')
      return
    }
    setAsking(false)
    router.refresh()
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === 'quoted' ? (
          <>
            <Button loading={busy === 'accept'} onClick={() => act('accept')}>Accept quote</Button>
            <Button variant="secondary" className="border-2 border-ink" onClick={() => setAsking((a) => !a)} aria-expanded={asking}>
              Ask a question / request a change
            </Button>
          </>
        ) : null}
        <Button variant="secondary" className="border-2 border-ink" onClick={() => basket.replace(lines)} disabled={!lines.length}>
          Duplicate into basket
        </Button>
      </div>
      {asking ? (
        <div className="grid gap-2">
          <TextArea name="change" label="What would you like to change?" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button className="w-fit" loading={busy === 'revise'} onClick={() => act('revise')} disabled={!message.trim()}>Send request</Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm font-semibold text-error">{error}</p> : null}
    </div>
  )
}
