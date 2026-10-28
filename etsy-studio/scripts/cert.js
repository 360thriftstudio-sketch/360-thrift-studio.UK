// Self-signed certificate for the local HTTPS OAuth callback (https://localhost:3003/oauth/callback).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getConfig } from '../src/lib/config.js'

const dir = getConfig().paths.certs
fs.mkdirSync(dir, { recursive: true })
const key = path.join(dir, 'localhost-key.pem')
const cert = path.join(dir, 'localhost.pem')
if (fs.existsSync(key) && !process.argv.includes('--force')) {
  console.log(`Certificate already exists in ${dir} (use --force to replace).`)
  process.exit(0)
}
const r = spawnSync(
  'openssl',
  ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '825', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', key, '-out', cert],
  { stdio: 'inherit' },
)
if (r.error || r.status !== 0) {
  console.error('openssl is required (Git for Windows includes it: C:\\Program Files\\Git\\usr\\bin\\openssl.exe).')
  process.exit(1)
}
fs.chmodSync(key, 0o600)
console.log(`Created ${cert}. Your browser will warn about the self-signed certificate on the callback page; that is expected for localhost.`)
