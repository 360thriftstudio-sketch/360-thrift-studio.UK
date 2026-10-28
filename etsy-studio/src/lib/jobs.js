import { getSetting, setSetting, now } from './db.js'

const STALE_MS = 30 * 60 * 1000

/** Single-flight lock stored in the DB so CLI and dashboard runs cannot overlap. */
export async function withLock(db, name, fn) {
  const key = `lock:${name}`
  const held = getSetting(db, key)
  if (held && Date.now() - Date.parse(held.at) < STALE_MS) {
    throw Object.assign(new Error(`${name} is already running (started ${held.at}).`), { code: 'LOCKED' })
  }
  setSetting(db, key, { at: now(), pid: process.pid })
  try {
    return await fn()
  } finally {
    setSetting(db, key, null)
  }
}
