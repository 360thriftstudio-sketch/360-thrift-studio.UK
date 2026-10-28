// Etsy Open API v3 client. Every endpoint path, parameter and encoding used by the app lives here,
// so a change in Etsy's spec is a one-file fix. Verify against the Etsy Dev MCP / Open API reference.
//
// Rate limits: Etsy reports x-limit-per-second / x-remaining-this-second / x-limit-per-day /
// x-remaining-today. Requests are spaced to the per-second limit and refused near the daily floor.
// Retries: GETs retry on 429/5xx/network with jittered backoff. Writes retry only on 429 (the request
// was rejected, so repeating it cannot duplicate anything) — never on 5xx or a dropped connection.
import { getConfig } from './config.js'
import { getAccessToken } from './oauth.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class EtsyError extends Error {
  constructor(message, { status, body, retriable = false, permanent = false } = {}) {
    super(message)
    this.status = status
    this.body = body
    this.retriable = retriable
    this.permanent = permanent
  }
}

/** Etsy createDraftListing/updateListing take form encoding; arrays are comma-joined. */
export function encodeForm(fields) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') continue
    p.set(k, Array.isArray(v) ? v.join(',') : typeof v === 'boolean' ? String(v) : String(v))
  }
  return p
}

export class EtsyClient {
  constructor({ fetchImpl = fetch, tokenProvider = getAccessToken, config = getConfig().etsy, maxQps = 5 } = {}) {
    this.fetch = fetchImpl
    this.tokenProvider = tokenProvider
    this.cfg = config
    this.minGapMs = 1000 / maxQps
    this.lastAt = 0
    this.remainingToday = Infinity
    this.limits = {}
    this.isDemo = false
  }

  apiKeyHeader() {
    // Etsy requires "keystring:shared_secret" in x-api-key for v3 requests.
    return this.cfg.sharedSecret ? `${this.cfg.keystring}:${this.cfg.sharedSecret}` : this.cfg.keystring
  }

  async request(method, path, { query, form, json, multipart, auth = true, attempt = 0 } = {}) {
    if (this.remainingToday < 50) throw new EtsyError('Etsy daily request budget nearly used; stopping until tomorrow.', { retriable: false })
    const gap = this.lastAt + this.minGapMs - Date.now()
    if (gap > 0) await sleep(gap)
    this.lastAt = Date.now()

    const url = new URL(this.cfg.apiBase + path)
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    const headers = { 'x-api-key': this.apiKeyHeader(), accept: 'application/json' }
    if (auth) headers.authorization = `Bearer ${(await this.tokenProvider()).access_token}`
    let body
    if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded'
      body = encodeForm(form).toString()
    } else if (json) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(json)
    } else if (multipart) {
      body = multipart // FormData; fetch sets the boundary
    }

    const isRead = method === 'GET'
    let res
    try {
      res = await this.fetch(url, { method, headers, body })
    } catch (err) {
      if (isRead && attempt < 4) {
        await sleep(backoff(attempt))
        return this.request(method, path, { query, form, json, multipart, auth, attempt: attempt + 1 })
      }
      throw new EtsyError(`Network error calling Etsy ${method} ${path}: ${err.message}`, { retriable: isRead })
    }
    this.readLimits(res.headers)
    if (res.status === 429 && attempt < 4) {
      const ra = Number(res.headers.get('retry-after'))
      await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : backoff(attempt))
      return this.request(method, path, { query, form, json, multipart, auth, attempt: attempt + 1 })
    }
    if (res.status >= 500 && isRead && attempt < 4) {
      await sleep(backoff(attempt))
      return this.request(method, path, { query, form, json, multipart, auth, attempt: attempt + 1 })
    }
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text.slice(0, 500) }
    }
    if (!res.ok) {
      const msg = data?.error || data?.error_description || res.statusText
      throw new EtsyError(`Etsy ${method} ${path} → ${res.status}: ${msg}`, {
        status: res.status,
        body: data,
        permanent: res.status >= 400 && res.status < 500 && res.status !== 429,
      })
    }
    return data
  }

  readLimits(h) {
    const n = (k) => (h.get(k) === null ? undefined : Number(h.get(k)))
    this.limits = {
      perSecond: n('x-limit-per-second'),
      remainingSecond: n('x-remaining-this-second'),
      perDay: n('x-limit-per-day'),
      remainingToday: n('x-remaining-today'),
    }
    if (Number.isFinite(this.limits.perSecond) && this.limits.perSecond > 0) {
      this.minGapMs = Math.max(this.minGapMs, 1000 / this.limits.perSecond)
    }
    if (Number.isFinite(this.limits.remainingToday)) this.remainingToday = this.limits.remainingToday
  }

  /** Offset pagination until `count` is reached. */
  async paginate(path, query = {}, { limit = 100, max = 50_000 } = {}) {
    const out = []
    for (let offset = 0; offset < max; offset += limit) {
      const page = await this.request('GET', path, { query: { ...query, limit, offset } })
      const results = page?.results ?? []
      out.push(...results)
      const count = Number(page?.count ?? 0)
      if (!results.length || out.length >= count || results.length < limit) break
    }
    return out
  }

  // ---- reads ----
  ping() {
    return this.request('GET', '/application/openapi-ping', { auth: false })
  }
  getMe() {
    return this.request('GET', '/application/users/me')
  }
  getShop(shopId) {
    return this.request('GET', `/application/shops/${shopId}`)
  }
  listShopSections(shopId) {
    return this.request('GET', `/application/shops/${shopId}/sections`).then((r) => r?.results ?? [])
  }
  listListings(shopId, state = 'active') {
    return this.paginate(`/application/shops/${shopId}/listings`, { state, includes: 'Images,Videos' })
  }
  getListing(listingId) {
    return this.request('GET', `/application/listings/${listingId}`, { query: { includes: 'Images,Videos' } })
  }
  listListingImages(listingId) {
    return this.request('GET', `/application/listings/${listingId}/images`).then((r) => r?.results ?? [])
  }
  listListingFiles(shopId, listingId) {
    return this.request('GET', `/application/shops/${shopId}/listings/${listingId}/files`).then((r) => r?.results ?? [])
  }
  listReceipts(shopId, { minCreated } = {}) {
    return this.paginate(`/application/shops/${shopId}/receipts`, { min_created: minCreated })
  }
  listReviews(shopId) {
    return this.paginate(`/application/shops/${shopId}/reviews`, {}, { max: 5000 })
  }
  listShippingProfiles(shopId) {
    return this.request('GET', `/application/shops/${shopId}/shipping-profiles`).then((r) => r?.results ?? [])
  }
  listReturnPolicies(shopId) {
    return this.request('GET', `/application/shops/${shopId}/policies/return`).then((r) => r?.results ?? [])
  }
  listReadinessStates(shopId) {
    // Processing profiles (2025+). Physical drafts need a readiness_state_id.
    return this.request('GET', `/application/shops/${shopId}/readiness-state-definitions`).then((r) => r?.results ?? [])
  }
  listProductionPartners(shopId) {
    return this.request('GET', `/application/shops/${shopId}/production-partners`).then((r) => r?.results ?? [])
  }
  getSellerTaxonomy() {
    return this.request('GET', '/application/seller-taxonomy/nodes', { auth: false }).then((r) => r?.results ?? [])
  }

  // ---- writes (listings_w) ----
  createDraftListing(shopId, fields) {
    return this.request('POST', `/application/shops/${shopId}/listings`, { form: fields })
  }
  updateListing(shopId, listingId, fields) {
    return this.request('PATCH', `/application/shops/${shopId}/listings/${listingId}`, { form: fields })
  }
  updateInventory(listingId, inventory) {
    return this.request('PUT', `/application/listings/${listingId}/inventory`, { json: inventory })
  }
  uploadListingImage(shopId, listingId, { buffer, filename, mime, rank, altText }) {
    const fd = new FormData()
    fd.set('image', new Blob([buffer], { type: mime }), filename)
    if (rank) fd.set('rank', String(rank))
    if (altText) fd.set('alt_text', altText)
    return this.request('POST', `/application/shops/${shopId}/listings/${listingId}/images`, { multipart: fd })
  }
  uploadListingFile(shopId, listingId, { buffer, filename, mime, rank }) {
    const fd = new FormData()
    fd.set('file', new Blob([buffer], { type: mime }), filename)
    fd.set('name', filename)
    if (rank) fd.set('rank', String(rank))
    return this.request('POST', `/application/shops/${shopId}/listings/${listingId}/files`, { multipart: fd })
  }
  uploadListingVideo(shopId, listingId, { buffer, filename, mime }) {
    const fd = new FormData()
    fd.set('video', new Blob([buffer], { type: mime }), filename)
    fd.set('name', filename)
    return this.request('POST', `/application/shops/${shopId}/listings/${listingId}/videos`, { multipart: fd })
  }
}

function backoff(attempt) {
  return Math.min(16_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 400)
}
