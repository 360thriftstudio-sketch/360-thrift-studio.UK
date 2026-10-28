// Store a service token (e.g. the Kreatorium mockup bearer token) in the OS vault, read from stdin
// so it never appears in shell history:   node scripts/set-secret.js kreatorium < token.txt
import { vault } from '../src/lib/vault.js'

const name = process.argv[2]
if (!/^[a-z0-9_-]+$/.test(name ?? '')) {
  console.error('Usage: node scripts/set-secret.js <name>   (token on stdin)')
  process.exit(1)
}
const chunks = []
process.stdin.on('data', (c) => chunks.push(c))
process.stdin.on('end', () => {
  const value = Buffer.concat(chunks).toString('utf8').trim()
  if (!value) {
    console.error('No value on stdin.')
    process.exit(1)
  }
  vault.set(name, value)
  console.log(`Stored "${name}" in the ${vault.available()} vault.`)
})
if (process.stdin.isTTY) console.log('Paste the value, then press Enter and Ctrl+D (Ctrl+Z then Enter on Windows):')
