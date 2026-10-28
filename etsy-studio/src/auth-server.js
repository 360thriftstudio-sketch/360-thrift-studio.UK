// One-shot HTTPS callback server for Etsy OAuth (PKCE). Run with `npm run auth`.
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig, ensureDirs } from './lib/config.js'
import { buildAuthorizeUrl, createPkce, createState, exchangeCode, stateMatches } from './lib/oauth.js'
import { getDb, audit } from './lib/db.js'
import { vault } from './lib/vault.js'

const cfg = getConfig()
ensureDirs(cfg)
const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}
if (!cfg.etsy.keystring || cfg.etsy.keystring === 'replace_me') fail('Set ETSY_KEYSTRING in .env first (see .env.example).')
const vaultName = vault.available()
if (!vaultName) {
  try {
    vault.get('probe')
  } catch (e) {
    fail(e.message)
  }
}
const redirect = new URL(cfg.etsy.redirectUri)
if (redirect.protocol !== 'https:') fail('ETSY_REDIRECT_URI must be HTTPS.')
const keyFile = path.join(cfg.paths.certs, 'localhost-key.pem')
const certFile = path.join(cfg.paths.certs, 'localhost.pem')
if (!fs.existsSync(keyFile)) fail('No local certificate. Run `npm run cert` first.')

const { verifier, challenge } = createPkce()
const state = createState()
let used = false
const url = buildAuthorizeUrl({ clientId: cfg.etsy.keystring, redirectUri: cfg.etsy.redirectUri, scopes: cfg.etsy.scopes, state, challenge })

const page = (title, body) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;max-width:560px;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p></body>`

const server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
  res.setHeader('Cache-Control', 'no-store')
  const u = new URL(req.url, cfg.etsy.redirectUri)
  if (u.pathname !== redirect.pathname) {
    res.writeHead(404).end()
    return
  }
  const send = (code, title, body) => {
    res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' })
    res.end(page(title, body))
  }
  if (used) return send(400, 'Already used', 'This authorisation link was already used. Run <code>npm run auth</code> again.')
  if (u.searchParams.get('error')) {
    used = true
    send(400, 'Not connected', `Etsy said: ${escapeHtml(u.searchParams.get('error_description') || u.searchParams.get('error'))}`)
    return finish(1)
  }
  if (!stateMatches(state, u.searchParams.get('state'))) {
    send(400, 'State mismatch', 'The response did not match this session, so it was ignored. Run <code>npm run auth</code> again.')
    return
  }
  used = true
  try {
    const token = await exchangeCode({ code: u.searchParams.get('code'), verifier })
    audit(getDb(), 'etsy.oauth.connect', { actor: 'operator', detail: { scopes: token.scopes, user_id: token.user_id, vault: vault.available() } })
    send(200, 'Etsy connected', `Scopes: ${token.scopes.join(', ')}. The token is encrypted in your ${escapeHtml(vault.available())} store. You can close this tab and run <code>npm run sync</code>.`)
    finish(0)
  } catch (e) {
    send(400, 'Token exchange failed', escapeHtml(e.message))
    finish(1)
  }
})

function finish(code) {
  setTimeout(() => server.close(() => process.exit(code)), 300)
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

server.listen(Number(redirect.port || cfg.etsy.authPort), redirect.hostname === 'localhost' ? '127.0.0.1' : redirect.hostname, () => {
  console.log(`Requesting scopes: ${cfg.etsy.scopes.join(' ')}`)
  console.log('Open this URL in your browser to connect your Etsy shop:\n')
  console.log(url + '\n')
  console.log('Waiting for Etsy to redirect back… (Ctrl+C to cancel)')
})
