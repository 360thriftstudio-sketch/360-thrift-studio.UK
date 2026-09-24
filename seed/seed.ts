/**
 * Seed entry point. Keeps imports minimal so the preview fast path exits
 * without loading Payload; the real work lives in seed-main.ts.
 *
 *   pnpm seed          taxonomy + info pages + settings
 *   pnpm seed --demo   also publishes DEMO- lots so listings have content (dev only)
 *   --if-empty         skip when already seeded (SQLite preview: build-time marker)
 */
import 'dotenv/config'

import { existsSync } from 'node:fs'

if (process.argv.includes('--if-empty') && existsSync('.preview-db-ready')) {
  console.log('[seed] preview database prepared at build time — skipping')
  process.exit(0)
}

const { default: seed } = await import('./seed-main')
seed().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
