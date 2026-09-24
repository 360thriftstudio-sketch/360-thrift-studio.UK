'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from 'react'

import type { ListingState } from '@/lib/facets'
import { toQueryString } from '@/lib/facets'

type Ctx = { pending: boolean; navigate: (next: Partial<ListingState>) => void; state: ListingState }

const ListingCtx = createContext<Ctx | null>(null)

export function useListing(): Ctx {
  const ctx = useContext(ListingCtx)
  if (!ctx) throw new Error('useListing must be used inside <ListingShell>')
  return ctx
}

/**
 * Holds URL-synced listing state. Controls update optimistically (checkboxes,
 * pills, sort) while the navigation runs in a transition and the grid dims.
 */
export function ListingShell({ state, children }: { state: ListingState; children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(state)
  const [serverState, setServerState] = useState(state)
  if (serverState !== state) {
    // new server result → it becomes the source of truth again
    setServerState(state)
    setOptimistic(state)
  }

  const navigate = useCallback(
    (next: Partial<ListingState>) => {
      const merged: ListingState = { ...optimistic, page: 1, ...next }
      setOptimistic(merged)
      startTransition(() => {
        router.push(`${pathname}${toQueryString(merged)}`, { scroll: false })
      })
    },
    [router, pathname, optimistic],
  )

  return <ListingCtx.Provider value={{ pending, navigate, state: optimistic }}>{children}</ListingCtx.Provider>
}

/** Grid wrapper: fades to 60% while new results load (200 ms). */
export function ListingResults({ children }: { children: ReactNode }) {
  const { pending } = useListing()
  return (
    <div
      aria-busy={pending || undefined}
      className="transition-opacity duration-[var(--dur-base)] ease-out data-[pending=true]:opacity-60"
      data-pending={pending || undefined}
    >
      {children}
    </div>
  )
}
