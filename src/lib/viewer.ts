import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

import type { Customer } from '@/payload-types'

import { getPayloadClient } from './catalogue'
import type { Viewer } from './pricing'

export type SiteViewer = Viewer & { customer: Customer | null; isStaff: boolean }

/** Who is looking at the page: guest, customer (trade-approved or not) or staff. */
export const getViewer = cache(async (): Promise<SiteViewer> => {
  const payload = await getPayloadClient()
  try {
    const { user } = await payload.auth({ headers: await headers() })
    if (user?.collection === 'customers') {
      const customer = user as unknown as Customer
      return { loggedIn: true, tradeApproved: customer.tradeStatus === 'approved', customer, isStaff: false }
    }
    if (user?.collection === 'users') {
      return { loggedIn: true, tradeApproved: true, customer: null, isStaff: true }
    }
  } catch {
    // invalid/expired token → treat as guest
  }
  return { loggedIn: false, tradeApproved: false, customer: null, isStaff: false }
})
