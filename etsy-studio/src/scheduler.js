// Optional in-process refresh. It can only read: it imports sync and research functions and
// nothing that writes to Etsy listings. Timers stop when the dashboard process stops.
import { getConfig } from './lib/config.js'
import { currentShop } from './lib/db.js'
import { syncEtsy } from './lib/etsy-sync.js'
import { syncResearch, keywordGaps, latestKeywords, storeOpportunities, importWatchedFolder } from './lib/research.js'
import { runAudit } from './lib/seo.js'
import { etsyClientFor } from './lib/clients.js'
import { researchProviderFor } from './lib/krafie.js'
import { log } from './lib/log.js'

export function startScheduler(db) {
  const { etsyHours, researchHours } = getConfig().schedule
  const timers = []
  const every = (hours, name, fn) => {
    if (!hours || hours <= 0) return
    const run = async () => {
      try {
        await fn()
        log.info(`scheduled ${name} finished`)
      } catch (e) {
        log.warn(`scheduled ${name} failed; last good data kept`, { error: e.message })
      }
    }
    timers.push(setInterval(run, hours * 3600_000))
    log.info(`scheduled ${name} every ${hours}h (stops when this process stops)`)
  }
  every(etsyHours, 'Etsy refresh', async () => {
    const shop = currentShop(db)
    if (!shop) return
    await syncEtsy(db, etsyClientFor(shop), { isDemo: shop.is_demo })
    runAudit(db, currentShop(db), { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
  })
  every(researchHours, 'research refresh', async () => {
    const shop = currentShop(db)
    if (!shop) return
    await syncResearch(db, shop, researchProviderFor(shop))
    importWatchedFolder(db, shop)
    storeOpportunities(db, shop, keywordGaps(db, shop))
  })
  return { stop: () => timers.forEach(clearInterval), next: { etsyHours, researchHours } }
}
