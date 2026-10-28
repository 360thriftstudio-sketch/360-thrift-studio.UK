import { EtsyClient } from './etsy.js'
import { DemoEtsyClient } from './demo-etsy.js'
import { currentShop, getDb } from './db.js'

let override
/** Tests and scripts can inject a client. */
export function setEtsyClient(c) {
  override = c
}

/** The demo shop always uses the offline fake; a connected shop uses the real API. */
export function etsyClientFor(shop = currentShop(getDb())) {
  if (override) return override
  if (shop?.is_demo) return new DemoEtsyClient()
  return new EtsyClient()
}
