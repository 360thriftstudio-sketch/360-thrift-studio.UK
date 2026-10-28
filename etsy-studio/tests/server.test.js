import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { setup, demoShop, png } from './helpers.js'

const ctx = await setup()
const { db } = ctx
const { client } = await demoShop(db, ctx)
const { setEtsyClient } = await import('../src/lib/clients.js')
setEtsyClient(client)
const { createApp } = await import('../src/lib/app.js')

const server = http.createServer(createApp(db, { port: 0 }))
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
// Rebuild with the real port so the Host allow-list matches.
server.removeAllListeners('request')
server.on('request', createApp(db, { port }))
after(() => server.close())

const base = `http://127.0.0.1:${port}`
async function req(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(base + path, { method, headers, body })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* not json */
  }
  return { status: res.status, headers: res.headers, json, text }
}

const session = (await req('/api/session')).json

test('security headers and static allow-list', async () => {
  const r = await req('/')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await req('/../.env')).status, 404)
  assert.equal((await req('/%2e%2e/package.json')).status, 404)
  assert.equal((await req('/src/lib/config.js')).status, 404)
  assert.equal((await req('/api/assets/ast_..%2F..%2Fapp%2Fstudio/file')).status, 404)
})

test('session exposes no credentials', () => {
  const s = JSON.stringify(session)
  assert.ok(!/access_token|refresh_token|shared_secret|keystring/i.test(s))
})

test('rejects foreign Host headers (DNS rebinding)', async () => {
  const r = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: '/api/session', headers: { host: 'attacker.example' } }, (res) => resolve(res.statusCode))
  })
  assert.equal(r, 421)
})

test('writes need the session token and same origin', async () => {
  assert.equal((await req('/api/audit', { method: 'POST' })).status, 403)
  assert.equal((await req('/api/audit', { method: 'POST', headers: { 'x-studio-token': session.csrf, origin: 'https://evil.example' } })).status, 403)
  assert.equal((await req('/api/audit', { method: 'POST', headers: { 'x-studio-token': session.csrf, 'content-type': 'application/json' }, body: '{}' })).status, 200)
})

test('screen endpoints respond', async () => {
  for (const p of ['/api/home', '/api/optimize', '/api/research', '/api/performance', '/api/drafts', '/api/refs', '/api/creative', '/api/assets']) {
    const r = await req(p)
    assert.equal(r.status, 200, `${p}: ${r.text.slice(0, 200)}`)
  }
  const home = (await req('/api/home')).json
  assert.ok(home.fix_next.length <= 3 && home.make_next.length <= 3)
  assert.equal(Object.keys(home.metrics).length, 4)
})

test('upload is content-sniffed and served without sniffing', async () => {
  const buf = await png()
  const up = await req('/api/assets', { method: 'POST', headers: { 'x-studio-token': session.csrf, 'x-filename': encodeURIComponent('../../evil name.png') }, body: buf })
  assert.equal(up.status, 200)
  assert.equal(up.json.mime, 'image/png')
  assert.ok(!up.json.filename.includes('/'))
  const html = await req('/api/assets', { method: 'POST', headers: { 'x-studio-token': session.csrf, 'x-filename': 'x.png' }, body: '<html><script>alert(1)</script>' })
  const file = await req(`/api/assets/${html.json.id}/file`)
  assert.equal(file.headers.get('content-type'), 'application/octet-stream')
  assert.match(file.headers.get('content-disposition'), /^attachment/)
})
