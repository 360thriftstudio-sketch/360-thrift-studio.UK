// Remove the Etsy token (and optionally all local data). Etsy-side access can also be revoked
// from your Etsy account settings → Apps.
import fs from 'node:fs'
import { getConfig } from '../src/lib/config.js'
import { deleteToken } from '../src/lib/oauth.js'
import { vault } from '../src/lib/vault.js'

try {
  deleteToken()
  vault.delete('kreatorium')
  console.log('Etsy and Kreatorium tokens removed from the vault.')
} catch (e) {
  console.log(`Vault: ${e.message}`)
}
if (process.argv.includes('--delete-data')) {
  const p = getConfig().paths
  for (const d of [p.raw, p.research, p.imports, p.assets, p.app]) fs.rmSync(d, { recursive: true, force: true })
  console.log('Local snapshots, research, imports, assets and the database were deleted.')
}
