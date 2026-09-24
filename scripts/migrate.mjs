// Runs Postgres migrations. SQLite preview databases (DATABASE_URL=file:…)
// get their schema from `pnpm seed` instead, so migrations are skipped.
import 'dotenv/config'
import { spawnSync } from 'node:child_process'

if ((process.env.DATABASE_URL || '').startsWith('file:')) {
  console.log('[migrate] SQLite preview database — schema is pushed by the seed; skipping migrations')
  process.exit(0)
}
const args = ['payload', 'migrate', ...process.argv.slice(2)]
const res = spawnSync('pnpm', ['exec', ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
})
process.exit(res.status ?? 1)
