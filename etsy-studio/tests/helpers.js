// Each test file gets its own temporary data folder and an in-memory vault.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-test-'))
  process.env.STUDIO_DATA_DIR = dir
  const config = await import('../src/lib/config.js')
  config.getConfig({ reload: true })
  config.ensureDirs()
  const vault = await import('../src/lib/vault.js')
  vault.setVaultBackend(vault.memoryBackend())
  const db = await import('../src/lib/db.js')
  const handle = db.openDb(path.join(dir, 'app', 'studio.db'))
  db.setDb(handle)
  return { dir, db: handle }
}

/** Demo shop synced into the given db; returns the shop row and a demo client. */
export async function demoShop(db, { dir }) {
  const { generateDemoShop, DemoEtsyClient } = await import('../src/lib/demo-etsy.js')
  const { syncEtsy } = await import('../src/lib/etsy-sync.js')
  const { currentShop } = await import('../src/lib/db.js')
  const file = path.join(dir, 'app', 'demo-etsy.json')
  fs.writeFileSync(file, JSON.stringify(generateDemoShop({ now: Date.now() })))
  const client = new DemoEtsyClient({ file })
  await syncEtsy(db, client, { isDemo: true })
  return { shop: currentShop(db), client, file }
}

export const png = async (w = 64, h = 64) => (await import('../src/lib/png.js')).makePng(w, h, () => [200, 120, 80])
