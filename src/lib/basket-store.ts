'use client'

import { useSyncExternalStore } from 'react'

import type { PriceTier, PriceVisibility } from './pricing'

/** A lot in the quote basket. Snapshot of what the buyer saw when adding. */
export type BasketLine = {
  lotId: string
  slug: string
  title: string
  sku: string
  image?: string
  qty: number
  tiers: PriceTier[]
  priceVisibility: PriceVisibility
  weightKg?: number | null
  pieces?: number | null
  maxQty?: number | null
  moq?: number | null
}

type State = { lines: BasketLine[]; drawerOpen: boolean; announcement: string; hydrated: boolean }

const KEY = 'thrift360.quoteBasket.v1'
let state: State = { lines: [], drawerOpen: false, announcement: '', hydrated: false }
const listeners = new Set<() => void>()
const SERVER_STATE: State = { lines: [], drawerOpen: false, announcement: '', hydrated: false }

function emit() {
  for (const l of listeners) l()
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.lines))
  } catch {
    // storage full or blocked — basket still works for this visit
  }
}

function hydrate() {
  if (state.hydrated || typeof window === 'undefined') return
  let lines: BasketLine[] = []
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) lines = (JSON.parse(raw) as BasketLine[]).filter((l) => l && l.lotId && l.qty > 0)
  } catch {
    lines = []
  }
  state = { ...state, lines, hydrated: true }
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = { ...state, hydrated: false }
      hydrate()
      emit()
    }
  })
}

function set(next: Partial<State>, save = true) {
  state = { ...state, ...next }
  if (save) persist()
  emit()
}

const clampQty = (line: BasketLine, qty: number) => {
  const min = Math.max(1, line.moq ?? 1)
  const max = line.maxQty && line.maxQty > 0 ? line.maxQty : 999
  return Math.min(max, Math.max(min, Math.round(qty)))
}

export const basket = {
  subscribe(listener: () => void) {
    hydrate()
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => state,
  add(line: BasketLine, openDrawer = true) {
    hydrate()
    const existing = state.lines.find((l) => l.lotId === line.lotId)
    const lines = existing
      ? state.lines.map((l) => (l.lotId === line.lotId ? { ...l, ...line, qty: clampQty(l, l.qty + line.qty) } : l))
      : [...state.lines, { ...line, qty: clampQty(line, line.qty) }]
    set({ lines, drawerOpen: openDrawer, announcement: `Added ${line.title} to your quote basket.` })
  },
  setQty(lotId: string, qty: number) {
    set({ lines: state.lines.map((l) => (l.lotId === lotId ? { ...l, qty: clampQty(l, qty) } : l)), announcement: '' })
  },
  remove(lotId: string) {
    const line = state.lines.find((l) => l.lotId === lotId)
    set({
      lines: state.lines.filter((l) => l.lotId !== lotId),
      announcement: line ? `Removed ${line.title} from your quote basket.` : '',
    })
  },
  clear() {
    set({ lines: [], announcement: 'Quote basket cleared.' })
  },
  replace(lines: BasketLine[]) {
    set({ lines, drawerOpen: true, announcement: `${lines.length} lots added to your quote basket.` })
  },
  setDrawer(open: boolean) {
    set({ drawerOpen: open }, false)
  },
}

export function useBasket(): State {
  return useSyncExternalStore(basket.subscribe, basket.get, () => SERVER_STATE)
}

export const basketCount = (lines: BasketLine[]) => lines.length
