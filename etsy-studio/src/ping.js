// Harmless connectivity check: no OAuth, no shop data.
import { getConfig } from './lib/config.js'
import { EtsyClient } from './lib/etsy.js'

const cfg = getConfig()
if (!cfg.etsy.keystring || cfg.etsy.keystring === 'replace_me') {
  console.error('Set ETSY_KEYSTRING and ETSY_SHARED_SECRET in .env first.')
  process.exit(1)
}
try {
  const r = await new EtsyClient({ tokenProvider: async () => ({}) }).ping()
  console.log(`Etsy API reachable (ping ${r?.ping_id ?? 'ok'}). Your keystring was accepted.`)
} catch (e) {
  console.error(`Ping failed: ${e.message}`)
  if (e.status === 403 || e.status === 401) console.error('Check the keystring/shared secret and that the app is approved and active.')
  process.exit(1)
}
