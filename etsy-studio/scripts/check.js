// `npm run check`: syntax-check every JS file and scan tracked-looking files for secrets.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT } from '../src/lib/config.js'

const SKIP = new Set(['node_modules', 'data', 'output', 'certs', '.git'])
const files = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else files.push(p)
  }
})(ROOT)

let failed = 0
for (const f of files.filter((f) => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' })
  if (r.status !== 0) {
    failed++
    console.error(`✗ ${path.relative(ROOT, f)}\n${r.stderr}`)
  }
}
const SECRET = /(ETSY_SHARED_SECRET\s*=\s*(?!replace_me)\S+|\b\d{6,}\.[A-Za-z0-9_-]{30,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{20,})/
for (const f of files) {
  if (/\.(png|jpe?g|gif|webp|mp4|pdf|zip)$/i.test(f) || path.basename(f) === '.env') continue
  const m = fs.readFileSync(f, 'utf8').match(SECRET)
  if (m) {
    failed++
    console.error(`✗ possible secret in ${path.relative(ROOT, f)}`)
  }
}
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
  if (!/^\.env$/m.test(ignore)) {
    failed++
    console.error('✗ .env exists but is not gitignored')
  }
}
console.log(failed ? `${failed} problem(s)` : `✓ ${files.filter((f) => f.endsWith('.js')).length} files pass syntax check; no secrets found`)
process.exit(failed ? 1 : 0)
