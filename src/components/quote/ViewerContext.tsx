'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { priceAccess, type PriceAccess, type PriceVisibility } from '@/lib/pricing'

export type ClientViewer = {
  loggedIn: boolean
  tradeApproved: boolean
  requireLoginForPrices: boolean
  name?: string | null
}

const Ctx = createContext<ClientViewer>({ loggedIn: false, tradeApproved: false, requireLoginForPrices: false })

export function ViewerProvider({ viewer, children }: { viewer: ClientViewer; children: ReactNode }) {
  return <Ctx.Provider value={viewer}>{children}</Ctx.Provider>
}

export const useViewer = () => useContext(Ctx)

export function usePriceAccess(visibility: PriceVisibility): PriceAccess {
  const v = useViewer()
  return priceAccess(visibility, v, v.requireLoginForPrices)
}
