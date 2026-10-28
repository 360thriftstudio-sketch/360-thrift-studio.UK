// Etsy OAuth 2.0 Authorization Code + PKCE (S256). No `resource` parameter is sent.
import crypto from 'node:crypto'
import { getConfig } from './config.js'
import { vault } from './vault.js'

export const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect'
export const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'
const TOKEN_ENTRY = 'etsy-oauth'

export const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function createPkce() {
  const verifier = b64url(crypto.randomBytes(48)) // 64 chars, within RFC 7636's 43–128
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function createState() {
  return b64url(crypto.randomBytes(32))
}

export function buildAuthorizeUrl({ clientId, redirectUri, scopes, state, challenge }) {
  const u = new URL(AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('scope', scopes.join(' '))
  u.searchParams.set('state', state)
  u.searchParams.set('code_challenge', challenge)
  u.searchParams.set('code_challenge_method', 'S256')
  return u.toString()
}

/** Constant-time compare of the returned state against the one we issued. */
export function stateMatches(expected, received) {
  if (typeof expected !== 'string' || typeof received !== 'string') return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function tokenRequest(params, fetchImpl = fetch) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = new Error(`Etsy token endpoint: ${body.error || res.status}${body.error_description ? ` — ${body.error_description}` : ''}`)
    e.status = res.status
    throw e
  }
  return body
}

export function toStoredToken(body, scopes) {
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    token_type: body.token_type,
    expires_at: Date.now() + Number(body.expires_in ?? 3600) * 1000,
    // Etsy access tokens are prefixed with the user id: "<user_id>.<token>"
    user_id: Number(String(body.access_token).split('.')[0]) || null,
    scopes,
    obtained_at: new Date().toISOString(),
  }
}

export async function exchangeCode({ code, verifier }, fetchImpl) {
  const cfg = getConfig()
  const body = await tokenRequest(
    {
      grant_type: 'authorization_code',
      client_id: cfg.etsy.keystring,
      redirect_uri: cfg.etsy.redirectUri,
      code,
      code_verifier: verifier,
    },
    fetchImpl,
  )
  const token = toStoredToken(body, cfg.etsy.scopes)
  vault.set(TOKEN_ENTRY, token)
  return token
}

export function readToken() {
  return vault.getJson(TOKEN_ENTRY)
}
export function deleteToken() {
  vault.delete(TOKEN_ENTRY)
}

let refreshing = null
/** A valid access token, refreshing it when it expires within two minutes. */
export async function getAccessToken(fetchImpl) {
  const token = readToken()
  if (!token) throw Object.assign(new Error('Etsy is not connected. Run `npm run auth`.'), { code: 'NOT_CONNECTED' })
  if (token.expires_at - Date.now() > 120_000) return token
  refreshing ??= (async () => {
    try {
      const body = await tokenRequest(
        { grant_type: 'refresh_token', client_id: getConfig().etsy.keystring, refresh_token: token.refresh_token },
        fetchImpl,
      )
      const next = toStoredToken(body, token.scopes)
      vault.set(TOKEN_ENTRY, next)
      return next
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}
