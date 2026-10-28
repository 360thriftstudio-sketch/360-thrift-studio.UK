// Builds the fictional demo shop and runs the real sync, research and audit code against it.
import fs from 'node:fs'
import path from 'node:path'
import { getConfig, ensureDirs } from '../src/lib/config.js'
import { getDb, currentShop } from '../src/lib/db.js'
import { generateDemoShop, DemoEtsyClient } from '../src/lib/demo-etsy.js'
import { syncEtsy } from '../src/lib/etsy-sync.js'
import { DemoResearchProvider } from '../src/lib/krafie.js'
import { syncResearch, keywordGaps, storeOpportunities, latestKeywords, importInsights } from '../src/lib/research.js'
import { runAudit } from '../src/lib/seo.js'

const cfg = getConfig()
ensureDirs(cfg)
const db = getDb()
const existing = currentShop(db)
if (existing && !existing.is_demo) {
  console.error('A real shop is connected in this data folder; refusing to mix in demo data. Use STUDIO_DATA_DIR=./data-demo npm run demo')
  process.exit(1)
}
const file = path.join(cfg.paths.app, 'demo-etsy.json')
if (!fs.existsSync(file) || process.argv.includes('--reset')) fs.writeFileSync(file, JSON.stringify(generateDemoShop()))
const r = await syncEtsy(db, new DemoEtsyClient({ file }), { isDemo: true })
const shop = currentShop(db)
await syncResearch(db, shop, new DemoResearchProvider())
if (!db.prepare('SELECT 1 FROM marketplace_insights_imports WHERE shop_id=? LIMIT 1').get(shop.shop_id)) {
  importInsights(db, shop, 'keyword,searches_30d,listings_30d,trend\npersonalized candle,5400,21000,rising\nbookish candle,2100,3900,rising\ndigital planner ipad,8800,64000,stable\n', { filename: 'demo-insights.csv' })
}
storeOpportunities(db, shop, keywordGaps(db, shop))
runAudit(db, shop, { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
console.log(`Demo shop ready: ${r.active} listings, ${r.receipts} receipts (fictional). Start with: npm run dashboard`)
