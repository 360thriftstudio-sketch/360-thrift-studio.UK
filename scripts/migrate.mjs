// `pnpm migrate`: runs Payload migrations for the configured database.
// SQLite preview databases are migrated + seeded during `pnpm build`
// (scripts/prepare-preview-db.mjs); at start-up that work is skipped.
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

export const PREVIEW_MARKER = '.preview-db-ready'

const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
if (isSqlite && existsSync(PREVIEW_MARKER)) {
  console.log('[migrate] SQLite preview database prepared at build time — skipping')
  process.exit(0)
}
const res = spawnSync('pnpm', ['exec', 'payload', 'migrate', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
})
process.exit(res.status ?? 1)
