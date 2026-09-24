// Runs before `next build`. For SQLite preview deploys (DATABASE_URL=file:…)
// it creates, migrates and seeds the database file so it ships with the build
// and start-up only has to start the server. No-op for Postgres.
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

const url = process.env.DATABASE_URL || ''
if (!url.startsWith('file:')) process.exit(0)

const file = url.slice('file:'.length)
const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--no-deprecation' } })
  if (res.status !== 0) process.exit(res.status ?? 1)
}

console.log(`[preview-db] preparing ${file}`)
rmSync(file, { force: true })
rmSync('.preview-db-ready', { force: true })
run('pnpm', ['exec', 'payload', 'migrate'])
run('pnpm', ['exec', 'tsx', 'seed/seed.ts', '--demo'])
writeFileSync('.preview-db-ready', new Date().toISOString())
console.log('[preview-db] ready')
