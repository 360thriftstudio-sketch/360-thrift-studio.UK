import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getConfig } from './config.js'

// node:sqlite prints an ExperimentalWarning on load; silence only that one.
const emit = process.emitWarning
process.emitWarning = (w, ...rest) => {
  if (String(w?.message ?? w).includes('SQLite is an experimental feature')) return
  return emit.call(process, w, ...rest)
}
const { DatabaseSync } = await import('node:sqlite')
process.emitWarning = emit

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS shops (
  shop_id INTEGER PRIMARY KEY, name TEXT, currency TEXT, url TEXT, is_demo INTEGER DEFAULT 0,
  data_json TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS source_syncs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, shop_id INTEGER, started_at TEXT, finished_at TEXT,
  status TEXT, scopes TEXT, range_start TEXT, range_end TEXT, counts_json TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS listings (
  listing_id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL, state TEXT, title TEXT, data_json TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS listings_shop ON listings(shop_id, state);
CREATE TABLE IF NOT EXISTS listing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER, listing_id INTEGER, captured_at TEXT, reason TEXT, data_json TEXT);
CREATE INDEX IF NOT EXISTS snapshots_listing ON listing_snapshots(listing_id, captured_at);
CREATE TABLE IF NOT EXISTS receipts_sanitized (
  receipt_id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL, created_at TEXT, status TEXT, is_paid INTEGER,
  subtotal_minor INTEGER, grandtotal_minor INTEGER, discount_minor INTEGER, shipping_minor INTEGER, currency TEXT);
CREATE INDEX IF NOT EXISTS receipts_shop ON receipts_sanitized(shop_id, created_at);
CREATE TABLE IF NOT EXISTS receipt_transactions (
  transaction_id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL, receipt_id INTEGER, listing_id INTEGER, title TEXT,
  sku TEXT, quantity INTEGER, price_minor INTEGER, currency TEXT, created_at TEXT, is_digital INTEGER);
CREATE INDEX IF NOT EXISTS tx_listing ON receipt_transactions(shop_id, listing_id);
CREATE INDEX IF NOT EXISTS tx_receipt ON receipt_transactions(receipt_id);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, shop_id INTEGER, listing_id INTEGER, rating INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS shop_refs (
  shop_id INTEGER, kind TEXT, ref_id INTEGER, name TEXT, data_json TEXT, PRIMARY KEY (shop_id, kind, ref_id));
CREATE TABLE IF NOT EXISTS taxonomy_nodes (
  id INTEGER PRIMARY KEY, parent_id INTEGER, name TEXT, path TEXT, level INTEGER, is_leaf INTEGER);
CREATE TABLE IF NOT EXISTS research_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER, provider TEXT, keyword TEXT, theme TEXT, opportunity REAL,
  demand REAL, trend REAL, competition REAL, est_sales REAL, captured_at TEXT, metrics_json TEXT, samples_json TEXT,
  UNIQUE (shop_id, provider, keyword, captured_at));
CREATE TABLE IF NOT EXISTS research_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER, provider TEXT, url TEXT, title TEXT, price REAL,
  currency TEXT, est_sales REAL, trend REAL, category TEXT, captured_at TEXT, data_json TEXT,
  UNIQUE (shop_id, provider, url, captured_at));
CREATE TABLE IF NOT EXISTS marketplace_insights_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER, keyword TEXT, searches INTEGER, listing_count INTEGER,
  trend TEXT, conversion REAL, price_low REAL, price_high REAL, range_start TEXT, range_end TEXT, captured_at TEXT,
  import_file TEXT, UNIQUE (shop_id, keyword, captured_at));
CREATE TABLE IF NOT EXISTS seo_recommendations (
  id TEXT PRIMARY KEY, shop_id INTEGER, listing_id INTEGER, issue_type TEXT, field TEXT, current_value TEXT,
  proposed_value TEXT, reason TEXT, source TEXT, confidence REAL, impact TEXT, severity REAL, priority REAL,
  automatable INTEGER, hero INTEGER DEFAULT 0, status TEXT DEFAULT 'suggested', baseline_json TEXT,
  created_at TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS recs_listing ON seo_recommendations(shop_id, listing_id, status);
CREATE TABLE IF NOT EXISTS recommendation_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, recommendation_id TEXT, shop_id INTEGER, listing_id INTEGER, field TEXT,
  old_value TEXT, new_value TEXT, approved_at TEXT, applied_at TEXT, readback_ok INTEGER, readback_value TEXT,
  baseline_json TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS product_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER, keyword TEXT, score REAL, confidence TEXT,
  components_json TEXT, computed_at TEXT);
CREATE TABLE IF NOT EXISTS product_briefs (
  id TEXT PRIMARY KEY, shop_id INTEGER, keyword TEXT, product_kind TEXT, product_type TEXT, audience TEXT,
  occasion TEXT, style TEXT, notes TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS listing_drafts (
  id TEXT PRIMARY KEY, shop_id INTEGER, brief_id TEXT, kind TEXT, fields_json TEXT, status TEXT,
  etsy_listing_id INTEGER, idempotency_key TEXT UNIQUE, stages_json TEXT, last_error TEXT, readback_json TEXT,
  created_at TEXT, updated_at TEXT, published_at TEXT);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, shop_id INTEGER, kind TEXT, mime TEXT, size INTEGER, filename TEXT, stored_name TEXT,
  sha256 TEXT, width INTEGER, height INTEGER, source TEXT, meta_json TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS draft_assets (
  draft_id TEXT, asset_id TEXT, role TEXT, rank INTEGER, alt_text TEXT, etsy_ref TEXT, upload_error TEXT,
  PRIMARY KEY (draft_id, asset_id, role));
CREATE TABLE IF NOT EXISTS creative_jobs (
  id TEXT PRIMARY KEY, shop_id INTEGER, provider TEXT, tool TEXT, kind TEXT, params_json TEXT,
  idempotency_key TEXT UNIQUE, cost_estimate_json TEXT, status TEXT, provider_job_id TEXT, output_asset_id TEXT,
  error TEXT, attempts INTEGER DEFAULT 0, next_poll_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS publish_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, draft_id TEXT, stage TEXT, status TEXT, started_at TEXT, finished_at TEXT,
  error TEXT, detail_json TEXT);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, actor TEXT, action TEXT, shop_id INTEGER, target TEXT, detail_json TEXT);
`

let shared
export function openDb(file = getConfig().paths.db) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)
  return db
}

export function getDb() {
  if (!shared) shared = openDb()
  return shared
}

/** Use an explicit database (tests, scripts). */
export function setDb(db) {
  shared = db
}

export function tx(db, fn) {
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export const now = () => new Date().toISOString()
export const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`
export const json = (v) => (v === undefined ? null : JSON.stringify(v))
export const parse = (s, d = null) => {
  if (s === null || s === undefined) return d
  try {
    return JSON.parse(s)
  } catch {
    return d
  }
}

export function getSetting(db, key, d = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? parse(row.value, d) : d
}
export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    json(value),
  )
}

export function audit(db, action, { actor = 'operator', shopId = null, target = null, detail = null } = {}) {
  db.prepare('INSERT INTO audit_log (at, actor, action, shop_id, target, detail_json) VALUES (?, ?, ?, ?, ?, ?)').run(
    now(),
    actor,
    action,
    shopId,
    target === null ? null : String(target),
    json(detail),
  )
}

/** The shop the dashboard works on: the connected shop, or the demo shop. */
export function currentShop(db) {
  const id = getSetting(db, 'current_shop_id')
  const row = id ? db.prepare('SELECT * FROM shops WHERE shop_id = ?').get(id) : db.prepare('SELECT * FROM shops LIMIT 1').get()
  return row ? { ...row, data: parse(row.data_json, {}), is_demo: !!row.is_demo } : null
}
