import http from 'node:http'
import { getConfig, ensureDirs } from './lib/config.js'
import { getDb, currentShop } from './lib/db.js'
import { createApp } from './lib/app.js'
import { startScheduler } from './scheduler.js'
import { importWatchedFolder } from './lib/research.js'

const cfg = getConfig()
ensureDirs(cfg)
const db = getDb()
const shop = currentShop(db)
if (shop) importWatchedFolder(db, shop)

const handler = createApp(db, { port: cfg.dashboard.port })
// Bound to loopback only. Hosting for other people needs real authentication first — see README.
const server = http.createServer(handler)
server.listen(cfg.dashboard.port, cfg.dashboard.host, () => {
  console.log(`Seller Studio running at http://${cfg.dashboard.host}:${cfg.dashboard.port}`)
  console.log(shop ? `Shop: ${shop.name}${shop.is_demo ? ' (demo data)' : ''}` : 'No shop yet — run `npm run demo:seed`, or `npm run auth` then `npm run sync`.')
})
startScheduler(db)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)))
