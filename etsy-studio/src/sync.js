import { ensureDirs } from './lib/config.js'
import { getDb, currentShop } from './lib/db.js'
import { syncEtsy } from './lib/etsy-sync.js'
import { EtsyClient } from './lib/etsy.js'
import { DemoEtsyClient } from './lib/demo-etsy.js'
import { runAudit } from './lib/seo.js'
import { latestKeywords } from './lib/research.js'

ensureDirs()
const db = getDb()
const existing = currentShop(db)
const demo = process.argv.includes('--demo') || (existing?.is_demo && !process.argv.includes('--live'))
const client = demo ? new DemoEtsyClient() : new EtsyClient()
try {
  const r = await syncEtsy(db, client, { isDemo: demo })
  runAudit(db, currentShop(db), { research: latestKeywords(db, r.shopId).map((k) => k.keyword) })
  console.log(`Synced${demo ? ' demo' : ''} shop ${r.shopId}: ${r.active} active listings, ${r.drafts} drafts, ${r.receipts} receipts, ${r.changed_listings} listing changes.`)
  if (r.warnings.length) console.log('Partial data:', r.warnings.join('; '))
} catch (e) {
  console.error(`Sync failed: ${e.message}`)
  console.error('The last successful data is unchanged.')
  process.exit(1)
}
