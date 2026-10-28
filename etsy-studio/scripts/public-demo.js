// Hosted demo: wipe the data folder, build the fictional shop, start the server on $PORT.
// Never connects to Etsy or Krafie; uses the offline demo clients only.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

process.env.STUDIO_PUBLIC_DEMO = '1'
process.env.STUDIO_DATA_DIR ??= path.join(os.tmpdir(), 'seller-studio-demo')
for (const k of ['ETSY_KEYSTRING', 'ETSY_SHARED_SECRET', 'ETSY_ENABLE_WRITES', 'KREATORIUM_MOCKUP_URL']) delete process.env[k]
fs.rmSync(process.env.STUDIO_DATA_DIR, { recursive: true, force: true })
await import('./demo-seed.js')
await import('../src/dashboard-server.js')
