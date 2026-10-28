import { ensureDirs } from './lib/config.js'
import { getDb, currentShop } from './lib/db.js'
import { syncResearch, keywordGaps, storeOpportunities, importWatchedFolder, latestKeywords } from './lib/research.js'
import { researchProviderFor } from './lib/krafie.js'
import { runAudit } from './lib/seo.js'

ensureDirs()
const db = getDb()
const shop = currentShop(db)
if (!shop) {
  console.error('Sync Etsy first (`npm run sync`) so research can be matched to your shop.')
  process.exit(1)
}
const seeds = process.argv.slice(2).filter((a) => !a.startsWith('--'))
try {
  const r = await syncResearch(db, shop, researchProviderFor(shop), seeds.length ? { seeds } : {})
  const imported = importWatchedFolder(db, shop)
  storeOpportunities(db, shop, keywordGaps(db, shop))
  runAudit(db, shop, { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
  console.log(`Research: ${r.keywords} keywords, ${r.listings} sample listings from ${r.seeds} seeds.${shop.is_demo ? ' (demo signals)' : ''}`)
  if (r.warnings.length) console.log('Warnings:', r.warnings.join('; '))
  for (const i of imported) console.log(`Marketplace Insights ${i.file}: ${i.error ?? `${i.imported} rows`}`)
} catch (e) {
  console.error(`Research refresh failed: ${e.message}`)
  if (/Could not start/.test(e.message)) console.error('Install and log in: npm install -g @krafie/mcp && krafie-mcp login')
  process.exit(1)
}
