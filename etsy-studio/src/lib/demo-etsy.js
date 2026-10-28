// A fictional, offline stand-in for the Etsy API with the same method surface as EtsyClient.
// It lets the whole app — sync, audits, drafts, uploads, publish — be exercised with no account.
// Nothing here talks to Etsy. All shop data is generated and contains no real people.
import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from './config.js'
import { EtsyError } from './etsy.js'

const money = (major, currency = 'USD') => ({ amount: Math.round(major * 100), divisor: 100, currency_code: currency })

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CATALOG = [
  // [title, tags, price, type, taxonomy, weight(sales popularity), images, favorites]
  ['Lavender Soy Candle 8oz Hand Poured Natural Wax Candle Relaxing Gift Candle Lavender Candle', ['lavender candle', 'soy candle', 'hand poured', 'relaxing gift'], 24, 'physical', 1633, 9, 6, 210],
  ['Personalized Name Candle, Custom Label Candle, Bridesmaid Proposal Gift', ['personalized candle', 'custom candle', 'bridesmaid gift', 'name candle', 'proposal gift', 'wedding favor', 'custom label', 'gift for her', 'bridal party', 'maid of honor', 'candle gift', 'personalized gift', 'bride squad'], 32, 'physical', 1633, 12, 8, 480],
  ['Printable Weekly Planner PDF Undated Planner Insert A5 Letter Instant Download', ['weekly planner', 'printable planner', 'undated planner', 'planner insert', 'a5 planner', 'pdf planner', 'instant download'], 6, 'download', 2078, 14, 5, 690],
  ['Botanical Wall Art Set of 3 Printable Sage Green Leaf Prints Digital Download', ['botanical print', 'sage green decor', 'leaf wall art', 'printable art', 'set of 3 prints'], 9, 'download', 2078, 8, 4, 320],
  ['Wedding Seating Chart Template Editable Canva Minimalist', ['seating chart', 'wedding template', 'canva template', 'editable seating', 'minimalist wedding', 'wedding sign', 'table plan', 'reception sign', 'digital template'], 12, 'download', 2078, 6, 3, 150],
  ['Cedar and Smoke Wood Wick Candle', ['wood wick candle', 'cedar candle', 'smoky candle', 'mens candle', 'cabin decor', 'crackling candle'], 28, 'physical', 1633, 5, 2, 95],
  ['Budget Planner Printable Monthly Budget Tracker Finance Planner PDF', ['budget planner', 'budget tracker', 'finance planner', 'monthly budget', 'printable budget', 'savings tracker', 'expense tracker', 'debt tracker'], 5, 'download', 2078, 11, 6, 540],
  ['Teacher Appreciation Candle Thank You Teacher Gift End of Year', ['teacher gift', 'teacher candle', 'thank you gift', 'end of year gift'], 22, 'physical', 1633, 4, 4, 120],
  ['Kids Chore Chart Printable Responsibility Chart Reward Chart', ['chore chart', 'kids chore chart', 'reward chart', 'responsibility chart', 'printable chart', 'toddler chart', 'kids routine'], 4, 'download', 2078, 7, 5, 260],
  ['Pumpkin Spice Candle Fall Candle Autumn Decor Soy Candle Pumpkin Candle Fall Candle', ['pumpkin candle', 'fall candle', 'autumn decor', 'soy candle'], 24, 'physical', 1633, 6, 5, 300],
  ['Abstract Line Art Print Minimalist Face Drawing Printable', ['line art', 'minimalist print', 'face drawing', 'abstract art', 'printable wall art', 'modern decor'], 7, 'download', 2078, 3, 2, 80],
  ['Gratitude Journal Printable Daily Journal Pages', ['gratitude journal', 'daily journal', 'printable journal', 'mindfulness', 'self care printable'], 5, 'download', 2078, 4, 3, 140],
  ['Coffee Scented Candle Latte Candle Coffee Lover Gift', ['coffee candle', 'latte candle', 'coffee lover gift', 'cafe decor', 'soy candle', 'coffee gift', 'kitchen candle', 'morning candle'], 24, 'physical', 1633, 3, 6, 70],
  ['Baby Shower Games Bundle Printable Baby Shower Activities', ['baby shower games', 'baby shower', 'printable games', 'shower activities', 'game bundle', 'neutral baby shower', 'baby shower printable', 'party games', 'boho baby shower'], 8, 'download', 2078, 9, 7, 410],
  ['Candle Care Card', ['candle care'], 2, 'physical', 1633, 0.5, 1, 4],
  ['Meal Planner Printable Weekly Meal Plan Grocery List', ['meal planner', 'grocery list', 'meal plan', 'weekly menu', 'printable planner', 'food planner'], 4, 'download', 2078, 6, 0, 230],
]

export function generateDemoShop({ seed = 360, now = Date.now(), months = 18 } = {}) {
  const r = rng(seed)
  const shopId = 90000001
  const day = 86400
  const nowS = Math.floor(now / 1000)
  const listings = CATALOG.map(([title, tags, price, type, taxonomy, weight, imgs, favs], i) => {
    const listingId = 1000000 + i * 7919
    return {
      listing_id: listingId,
      shop_id: shopId,
      title,
      description:
        i % 5 === 3
          ? ''
          : `${title.split(/[,|]/)[0]}. ${type === 'download' ? 'Instant download — no physical item will be shipped.' : 'Made by hand in small batches.'}\n\nDetails:\n- ${tags.slice(0, 3).join('\n- ')}`,
      state: 'active',
      tags,
      materials: type === 'physical' && i % 3 !== 0 ? ['soy wax', 'cotton wick'] : [],
      price: money(price),
      quantity: type === 'download' ? 999 : 20 + (i % 7),
      taxonomy_id: i === 10 ? 66 : taxonomy, // one listing sits in a broad parent category
      listing_type: type,
      type,
      who_made: 'i_did',
      when_made: 'made_to_order',
      is_supply: false,
      shipping_profile_id: type === 'physical' ? (i === 13 ? null : 7001) : null,
      return_policy_id: type === 'physical' && i !== 5 ? 8001 : null,
      shop_section_id: type === 'download' ? 5002 : 5001,
      num_favorers: favs,
      views: Math.round(favs * (9 + r() * 6)),
      skus: i % 4 === 0 ? [] : [`SKU-${100 + i}`],
      url: `https://www.etsy.com/listing/${listingId}/demo`,
      creation_timestamp: nowS - Math.round((months * 30 - i * 9) * day),
      original_creation_timestamp: nowS - Math.round((months * 30 - i * 9) * day),
      last_modified_timestamp: nowS - Math.round(r() * 60 * day),
      should_auto_renew: true,
      is_personalizable: i === 1,
      images: Array.from({ length: imgs }, (_, k) => ({
        listing_image_id: listingId * 10 + k,
        rank: k + 1,
        alt_text: k === 0 && i % 2 === 0 ? `${title.split(/[,|]/)[0]}` : null,
        full_width: k === 0 && i % 6 === 2 ? 1200 : 2400,
        full_height: k === 0 && i % 6 === 2 ? 1200 : 2400,
        url_570xN: null,
      })),
      videos: i === 1 ? [{ video_id: 1 }] : [],
      _weight: weight,
    }
  })

  // Receipts: popularity-weighted, slight growth, seasonal lift for fall candles.
  const receipts = []
  let receiptId = 3000000000
  let txId = 4000000000
  const totalW = listings.reduce((s, l) => s + l._weight, 0)
  for (let d = months * 30; d >= 0; d--) {
    const ts = nowS - d * day
    const month = new Date(ts * 1000).getUTCMonth()
    const growth = 0.6 + 0.8 * (1 - d / (months * 30))
    const orders = Math.round((2 + r() * 3) * growth)
    for (let o = 0; o < orders; o++) {
      const items = r() < 0.18 ? 2 : 1
      const transactions = []
      for (let k = 0; k < items; k++) {
        let pick = r() * totalW
        let l = listings[0]
        for (const c of listings) {
          let w = c._weight
          if (/pumpkin|fall/i.test(c.title) && (month < 8 || month > 10)) w *= 0.15
          pick -= w
          if (pick <= 0) {
            l = c
            break
          }
        }
        const qty = l.type === 'physical' && r() < 0.15 ? 2 : 1
        transactions.push({
          transaction_id: txId++,
          listing_id: l.listing_id,
          title: l.title,
          quantity: qty,
          price: l.price,
          sku: l.skus[0] ?? '',
          is_digital: l.type === 'download',
          created_timestamp: ts,
          // Fields a real receipt carries and the sanitiser must drop:
          variations: [{ formatted_name: 'Personalization', formatted_value: 'Demo Name' }],
          buyer_user_id: 1,
        })
      }
      const sub = transactions.reduce((s, t) => s + (t.price.amount / 100) * t.quantity, 0)
      const discount = r() < 0.1 ? Math.round(sub * 10) / 100 : 0
      const ship = transactions.some((t) => !t.is_digital) ? 4.5 : 0
      const canceled = r() < 0.02
      receipts.push({
        receipt_id: receiptId++,
        status: canceled ? 'Canceled' : d > 3 ? 'Completed' : 'Paid',
        is_paid: !canceled,
        created_timestamp: ts,
        subtotal: money(sub - discount),
        grandtotal: money(sub - discount + ship),
        discount_amt: money(discount),
        total_shipping_cost: money(ship),
        transactions,
        // Fake buyer fields — present so tests prove they never reach disk.
        buyer_email: 'buyer@example.invalid',
        name: 'Demo Buyer',
        first_line: '1 Example Street',
        city: 'Example City',
        message_from_buyer: 'demo message',
      })
    }
  }
  for (const l of listings) delete l._weight

  return {
    user: { user_id: 70000001, shop_id: shopId },
    shop: {
      shop_id: shopId,
      shop_name: 'JuniperLaneDemo',
      title: 'Demo shop — fictional data',
      currency_code: 'USD',
      url: 'https://www.etsy.com/shop/JuniperLaneDemo',
      listing_active_count: listings.length,
      review_average: 4.86,
      review_count: 312,
      num_favorers: 1840,
    },
    sections: [
      { shop_section_id: 5001, title: 'Candles' },
      { shop_section_id: 5002, title: 'Printables' },
    ],
    shippingProfiles: [{ shipping_profile_id: 7001, title: 'Standard (demo)' }],
    returnPolicies: [{ return_policy_id: 8001, accepts_returns: true, accepts_exchanges: true, return_deadline: 30 }],
    readinessStates: [
      { readiness_state_id: 9001, readiness_state: 'ready_to_ship', min_processing_time: 1, max_processing_time: 3 },
      { readiness_state_id: 9002, readiness_state: 'made_to_order', min_processing_time: 3, max_processing_time: 7 },
    ],
    productionPartners: [],
    taxonomy: [
      { id: 66, parent_id: null, name: 'Art & Collectibles', level: 0, children: [{ id: 2078, parent_id: 66, name: 'Prints', level: 1, children: [] }] },
      { id: 891, parent_id: null, name: 'Home & Living', level: 0, children: [{ id: 1633, parent_id: 891, name: 'Candles', level: 1, children: [] }] },
      { id: 69150467, parent_id: null, name: 'Paper & Party Supplies', level: 0, children: [{ id: 6844, parent_id: 69150467, name: 'Planners', level: 1, children: [] }] },
    ],
    reviews: Array.from({ length: 60 }, (_, i) => ({
      listing_id: listings[i % listings.length].listing_id,
      rating: r() < 0.9 ? 5 : 4,
      created_timestamp: nowS - i * 5 * day,
      buyer_user_id: 1,
      review: 'demo',
    })),
    listings,
    receipts,
    drafts: [],
    files: {},
    nextListingId: 2000000,
  }
}

/** File-backed fake. `failNext` lets tests inject a failure at a given method. */
export class DemoEtsyClient {
  constructor({ file = path.join(getConfig().paths.app, 'demo-etsy.json'), state } = {}) {
    this.file = file
    this.isDemo = true
    this.failNext = {}
    this.calls = []
    if (state) this.state = state
    else if (fs.existsSync(file)) this.state = JSON.parse(fs.readFileSync(file, 'utf8'))
    else throw new Error('Demo shop not found. Run `npm run demo:seed`.')
  }
  save() {
    if (this.file) fs.writeFileSync(this.file, JSON.stringify(this.state))
  }
  hit(method) {
    this.calls.push(method)
    if (this.failNext[method]) {
      const f = this.failNext[method]
      delete this.failNext[method]
      // { status: undefined } simulates a dropped connection (outcome unknown)
      const { message = String(f), after } = typeof f === 'object' ? f : {}
      const status = typeof f === 'object' && 'status' in f ? f.status : 500
      if (after) after(this)
      throw new EtsyError(`Demo injected failure in ${method}: ${message}`, { status })
    }
  }
  find(listingId) {
    const l = [...this.state.listings, ...this.state.drafts].find((x) => x.listing_id === Number(listingId))
    if (!l) throw new EtsyError(`Listing ${listingId} not found`, { status: 404, permanent: true })
    return l
  }
  async ping() {
    return { ping_id: 1 }
  }
  async getMe() {
    this.hit('getMe')
    return this.state.user
  }
  async getShop() {
    return this.state.shop
  }
  async listShopSections() {
    return this.state.sections
  }
  async listListings(_shopId, state = 'active') {
    this.hit('listListings')
    return structuredClone([...this.state.listings, ...this.state.drafts].filter((l) => l.state === state))
  }
  async getListing(listingId) {
    this.hit('getListing')
    return structuredClone(this.find(listingId))
  }
  async listListingImages(listingId) {
    return structuredClone(this.find(listingId).images ?? [])
  }
  async listListingFiles(_shopId, listingId) {
    return structuredClone(this.state.files[listingId] ?? [])
  }
  async listReceipts(_shopId, { minCreated } = {}) {
    this.hit('listReceipts')
    return structuredClone(this.state.receipts.filter((r) => !minCreated || r.created_timestamp >= minCreated))
  }
  async listReviews() {
    return structuredClone(this.state.reviews)
  }
  async listShippingProfiles() {
    return this.state.shippingProfiles
  }
  async listReturnPolicies() {
    return this.state.returnPolicies
  }
  async listReadinessStates() {
    return this.state.readinessStates
  }
  async listProductionPartners() {
    return this.state.productionPartners
  }
  async getSellerTaxonomy() {
    return this.state.taxonomy
  }
  async createDraftListing(shopId, fields) {
    this.hit('createDraftListing')
    const listing = {
      listing_id: this.state.nextListingId++,
      shop_id: shopId,
      state: 'draft',
      title: fields.title,
      description: fields.description,
      tags: fields.tags ?? [],
      materials: fields.materials ?? [],
      price: money(Number(fields.price)),
      quantity: Number(fields.quantity),
      taxonomy_id: Number(fields.taxonomy_id),
      who_made: fields.who_made,
      when_made: fields.when_made,
      is_supply: !!fields.is_supply,
      type: fields.type ?? 'physical',
      listing_type: fields.type ?? 'physical',
      shipping_profile_id: fields.shipping_profile_id ?? null,
      readiness_state_id: fields.readiness_state_id ?? null,
      return_policy_id: fields.return_policy_id ?? null,
      images: [],
      videos: [],
      skus: [],
      num_favorers: 0,
      creation_timestamp: Math.floor(Date.now() / 1000),
    }
    this.state.drafts.push(listing)
    this.save()
    return structuredClone(listing)
  }
  async updateListing(_shopId, listingId, fields) {
    this.hit('updateListing')
    const l = this.find(listingId)
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'price') l.price = money(Number(v))
      else if (k === 'state') {
        if (v === 'active' && !l.images.length) throw new EtsyError('A listing needs at least one image to be active', { status: 400, permanent: true })
        l.state = v
        if (v === 'active') {
          this.state.drafts = this.state.drafts.filter((d) => d !== l)
          this.state.listings.push(l)
        }
      } else l[k] = v
    }
    this.save()
    return structuredClone(l)
  }
  async updateInventory(listingId, inventory) {
    this.hit('updateInventory')
    const l = this.find(listingId)
    l.skus = inventory.products.map((p) => p.sku).filter(Boolean)
    this.save()
    return inventory
  }
  async uploadListingImage(_shopId, listingId, { rank, altText, buffer }) {
    this.hit('uploadListingImage')
    const l = this.find(listingId)
    const img = { listing_image_id: listingId * 100 + l.images.length + 1, rank: rank ?? l.images.length + 1, alt_text: altText ?? null, full_width: 2000, full_height: 2000, bytes: buffer?.length }
    l.images.push(img)
    this.save()
    return img
  }
  async uploadListingFile(_shopId, listingId, { filename, buffer }) {
    this.hit('uploadListingFile')
    this.find(listingId)
    const list = (this.state.files[listingId] ??= [])
    const f = { listing_file_id: listingId * 100 + list.length + 1, filename, filesize: `${buffer.length} bytes`, rank: list.length + 1 }
    list.push(f)
    this.save()
    return f
  }
  async uploadListingVideo(_shopId, listingId, { filename }) {
    this.hit('uploadListingVideo')
    const l = this.find(listingId)
    const v = { video_id: listingId * 10 + 1, name: filename }
    l.videos = [v]
    this.save()
    return v
  }
}
