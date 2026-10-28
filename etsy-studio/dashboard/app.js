// Seller Studio front end. No framework; every value is set with textContent (never innerHTML).
const S = { session: null, cache: {} }

// ---------- dom helpers ----------
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') n.className = v
    else if (k === 'text') n.textContent = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else if (k === 'value') n.value = v
    else if (k === 'checked') n.checked = !!v
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat(Infinity)) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)))
  return n
}
const $ = (s, r = document) => r.querySelector(s)
/** append() that flattens arrays and skips null/false (Node.append would print "null"). */
const put = (node, ...kids) => node.append(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false))
const clear = (n) => {
  while (n.firstChild) n.firstChild.remove()
  return n
}

// ---------- formatting ----------
const money = (minor, cur = S.session?.shop?.currency ?? 'USD') => {
  if (minor === null || minor === undefined) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: minor >= 100000 ? 0 : 2 }).format(minor / 100)
  } catch {
    return (minor / 100).toFixed(2)
  }
}
const num = (n) => (n === null || n === undefined ? '—' : new Intl.NumberFormat().format(n))
const ago = (iso) => {
  if (!iso) return 'never'
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 1440) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / 1440)} d ago`
}
const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const label = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const scoreChip = (s) => el('span', { class: `score ${s >= 75 ? 's-hi' : s >= 55 ? 's-mid' : 's-lo'}`, text: s ?? '—' })
const delta = (pct) => (pct === null || pct === undefined ? el('span', { class: 'delta muted', text: 'no prior data' }) : el('span', { class: `delta ${pct >= 0 ? 'up' : 'down'}`, text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%` }))
const tip = (text) => el('button', { class: 'tip', type: 'button', 'data-tip': text, 'aria-label': text, text: 'i' })
const chip = (text, cls = '') => el('span', { class: `chip ${cls}`, text })
const STATUS_CLASS = { published: 'good', ready_to_publish: 'good', ready_to_create: 'info', etsy_draft_created: 'info', needs_attention: 'warn', validation_failed: 'bad', assets_incomplete: 'warn', local_draft: '', pushing: 'info' }
const STATUS_LABEL = { local_draft: 'Local draft', assets_incomplete: 'Assets incomplete', ready_to_create: 'Ready to create on Etsy', pushing: 'Sending to Etsy…', etsy_draft_created: 'Etsy draft created', needs_attention: 'Needs attention', validation_failed: 'Validation failed', ready_to_publish: 'Ready to publish', published: 'Published' }
const statusChip = (s) => chip(STATUS_LABEL[s] ?? label(s), STATUS_CLASS[s] ?? '')

// ---------- api ----------
async function api(method, path, body, { raw } = {}) {
  const headers = {}
  if (method !== 'GET') headers['x-studio-token'] = S.session?.csrf ?? ''
  let payload
  if (raw) {
    payload = raw.body
    Object.assign(headers, raw.headers)
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, data })
  return data
}

function toast(msg, kind = '') {
  const t = $('#toast')
  clear(t).append(el('div', { class: `toast ${kind}`, text: msg }))
  clearTimeout(toast.t)
  toast.t = setTimeout(() => clear(t), kind === 'error' ? 7000 : 3500)
}
async function run(btn, fn, okMsg) {
  if (btn) btn.disabled = true
  try {
    const r = await fn()
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg)
    return r
  } catch (e) {
    toast(e.message, 'error')
    throw e
  } finally {
    if (btn) btn.disabled = false
  }
}

// ---------- drawer & dialog ----------
let lastFocus
function openDrawer(title, build, { footer } = {}) {
  closeDrawer()
  lastFocus = document.activeElement
  const body = el('div', { class: 'body' })
  const foot = footer ? el('footer') : null
  const close = el('button', { class: 'ghost', type: 'button', 'aria-label': 'Close', text: '✕', onclick: closeDrawer })
  const head = el('header', {}, el('div', { class: 'spacer' }, el('h2', { id: 'drawer-title', text: title })), close)
  const d = el('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drawer-title' }, head, body, foot)
  const scrim = el('div', { class: 'scrim', onclick: closeDrawer })
  document.body.append(scrim, d)
  d.addEventListener('keydown', trap)
  const api = { body, footer: foot, head, setTitle: (t) => ($('#drawer-title').textContent = t), close: closeDrawer }
  Promise.resolve(build(api)).then(() => (d.querySelector('[autofocus]') ?? close).focus())
  return api
}
function closeDrawer() {
  document.querySelectorAll('.drawer, .scrim').forEach((n) => n.remove())
  if (lastFocus?.isConnected) lastFocus.focus()
}
function trap(e) {
  if (e.key === 'Escape') return closeDrawer()
  if (e.key !== 'Tab') return
  const f = [...e.currentTarget.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null)
  if (!f.length) return
  if (e.shiftKey && document.activeElement === f[0]) {
    e.preventDefault()
    f.at(-1).focus()
  } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
    e.preventDefault()
    f[0].focus()
  }
}
function confirmDialog(title, content, { confirmLabel = 'Confirm', danger = false, validate } = {}) {
  return new Promise((resolve) => {
    const ok = el('button', { class: danger ? 'primary' : 'primary', type: 'submit', text: confirmLabel })
    const dlg = el('dialog', { 'aria-labelledby': 'dlg-t' },
      el('form', { method: 'dialog' },
        el('div', { class: 'body stack' }, el('h2', { id: 'dlg-t', text: title }), content),
        el('footer', {}, el('button', { type: 'button', text: 'Cancel', onclick: () => dlg.close('cancel') }), ok)))
    const check = () => (ok.disabled = validate ? !validate() : false)
    dlg.addEventListener('input', check)
    dlg.addEventListener('change', check)
    check()
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue !== 'cancel' && dlg.returnValue !== '')
      dlg.remove()
    })
    ok.addEventListener('click', (e) => {
      e.preventDefault()
      dlg.close('ok')
    })
    document.body.append(dlg)
    dlg.showModal()
  })
}

// ---------- tables ----------
function sortableTable(columns, rows, { onRow, initial, empty = 'Nothing here yet.' } = {}) {
  let sortKey = initial?.key ?? null
  let dir = initial?.dir ?? 'desc'
  const table = el('table')
  const thead = el('thead')
  const tbody = el('tbody')
  table.append(thead, tbody)
  function render() {
    clear(thead).append(el('tr', {}, columns.map((c) => {
      const th = el('th', { class: c.num ? 'num' : null, scope: 'col', 'aria-sort': sortKey === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : null })
      if (c.sort === false) th.append(c.label, c.tip ? ' ' : '', c.tip ? tip(c.tip) : '')
      else th.append(el('button', { type: 'button', text: c.label, onclick: () => { dir = sortKey === c.key && dir === 'desc' ? 'asc' : 'desc'; sortKey = c.key; render() } }), c.tip ? ' ' : '', c.tip ? tip(c.tip) : '')
      return th
    })))
    const sorted = sortKey ? [...rows].sort((a, b) => {
      const col = columns.find((c) => c.key === sortKey)
      const va = col.value ? col.value(a) : a[sortKey]
      const vb = col.value ? col.value(b) : b[sortKey]
      const r = va === vb ? 0 : va === null || va === undefined ? 1 : vb === null || vb === undefined ? -1 : va > vb ? 1 : -1
      return dir === 'asc' ? r : -r
    }) : rows
    clear(tbody)
    if (!sorted.length) tbody.append(el('tr', {}, el('td', { colspan: columns.length, class: 'empty', text: empty })))
    for (const r of sorted) {
      const tr = el('tr', { tabindex: onRow ? 0 : null }, columns.map((c) => el('td', { class: c.num ? 'num' : null }, c.render ? c.render(r) : r[c.key] ?? '—')))
      if (onRow) {
        tr.addEventListener('click', (e) => { if (!e.target.closest('button,a')) onRow(r) })
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') onRow(r) })
      }
      tbody.append(tr)
    }
  }
  render()
  return el('div', { class: 'table-wrap' }, table)
}

// ---------- chart ----------
function barChart(points, { value, label: lbl, format }) {
  const svgNS = 'http://www.w3.org/2000/svg'
  const w = 720
  const h = 180
  const pad = { l: 8, r: 8, t: 10, b: 24 }
  const max = Math.max(1, ...points.map(value))
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `Monthly chart, ${points.length} months`)
  const bw = (w - pad.l - pad.r) / Math.max(points.length, 1)
  points.forEach((p, i) => {
    const v = value(p)
    const bh = ((h - pad.t - pad.b) * v) / max
    const r = document.createElementNS(svgNS, 'rect')
    r.setAttribute('x', pad.l + i * bw + 2)
    r.setAttribute('y', h - pad.b - bh)
    r.setAttribute('width', Math.max(2, bw - 4))
    r.setAttribute('height', Math.max(0, bh))
    r.setAttribute('rx', 3)
    r.setAttribute('class', 'barfill')
    const t = document.createElementNS(svgNS, 'title')
    t.textContent = `${lbl(p)}: ${format(v)}`
    r.append(t)
    svg.append(r)
    if (points.length <= 14 || i % 2 === 0) {
      const tx = document.createElementNS(svgNS, 'text')
      tx.setAttribute('x', pad.l + i * bw + bw / 2)
      tx.setAttribute('y', h - 8)
      tx.setAttribute('text-anchor', 'middle')
      tx.setAttribute('class', 'lbl')
      tx.textContent = lbl(p).slice(2)
      svg.append(tx)
    }
  })
  return el('div', { class: 'chart' }, svg)
}

// ---------- shell ----------
async function loadSession() {
  S.session = await api('GET', '/api/session')
  $('#disclosure').textContent = S.session.disclosure
  const b = clear($('#banner'))
  if (S.session.shop?.is_demo) b.append(el('div', { class: 'banner', text: 'Demo shop with fictional data. Etsy writes go to an offline stand-in; nothing reaches Etsy.' }))
  else if (!S.session.shop) b.append(el('div', { class: 'banner', text: 'No shop yet. Run `npm run demo:seed` to explore, or `npm run auth` then `npm run sync` to connect your Etsy shop.' }))
  const f = clear($('#side-foot'))
  if (S.session.shop) {
    f.append(
      el('div', { class: 'trunc', text: S.session.shop.name }),
      el('div', {}, 'Etsy ', el('span', { text: ago(S.session.sources?.etsy?.last_success) })),
      el('div', {}, 'Research ', el('span', { text: ago(S.session.sources?.research?.last_success) })),
      el('div', { text: S.session.shop.is_demo ? 'Writes: demo only' : S.session.etsy.writes.ok ? 'Writes: enabled (draft-first)' : 'Writes: read-only' }),
      el('div', { text: '🔒 Local · buyer details removed' }),
      el('a', { href: '/methodology.html', text: 'Sources & methodology' }),
    )
  }
}

const ROUTES = { home: viewHome, optimize: viewOptimize, research: viewResearch, create: viewCreate, drafts: viewDrafts, performance: viewPerformance }
async function route() {
  closeDrawer()
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?')
  const name = ROUTES[path] ? path : 'home'
  document.querySelectorAll('#nav a').forEach((a) => a.setAttribute('aria-current', a.dataset.route === name ? 'page' : 'false'))
  const view = clear($('#view'))
  view.append(el('p', { class: 'muted', text: 'Loading…' }))
  try {
    if (!S.session) await loadSession()
    if (!S.session.shop) {
      clear(view).append(el('div', { class: 'card empty' }, el('h1', { text: 'Connect a shop' }), el('p', { text: 'Run `npm run demo:seed` for the demo, or `npm run auth` then `npm run sync` for your shop. Then reload.' })))
      return
    }
    const out = await ROUTES[name](new URLSearchParams(qs ?? ''))
    clear(view).append(out)
    document.title = `${label(name)} · Seller Studio`
    updateDraftCount()
  } catch (e) {
    clear(view).append(el('div', { class: 'card' }, el('h1', { text: 'Something went wrong' }), el('p', { class: 'err', text: e.message })))
  }
}
async function updateDraftCount() {
  try {
    const { drafts } = await api('GET', '/api/drafts')
    const n = drafts.filter((d) => ['ready_to_publish', 'needs_attention', 'validation_failed'].includes(d.status)).length
    const c = $('#draft-count')
    c.hidden = !n
    c.textContent = n
  } catch {
    /* ignore */
  }
}
const head = (title, sub, ...actions) => el('div', { class: 'head' }, el('div', {}, el('h1', { text: title }), sub ? el('p', { class: 'sub', text: sub }) : null), el('div', { class: 'row' }, actions))

function refreshButtons() {
  const etsy = el('button', { type: 'button', text: 'Refresh Etsy' })
  etsy.onclick = () => run(etsy, () => api('POST', '/api/etsy/refresh'), (r) => `Synced ${r.active} listings, ${r.receipts} receipts`).then(() => { S.session = null; route() })
  const res = el('button', { type: 'button', text: 'Refresh research' })
  res.onclick = () => run(res, () => api('POST', '/api/research/refresh'), (r) => `${r.keywords} keywords from ${r.seeds} seeds`).then(() => { S.session = null; route() })
  return [etsy, res]
}

// ---------- HOME ----------
async function viewHome() {
  const h = await api('GET', '/api/home')
  const m = h.metrics
  const src = h.sources
  const fresh = (name, s) => el('span', { class: `chip ${s.last_error ? 'bad' : s.stale ? 'warn' : 'good'}`, text: `${name}: ${s.last_error ? 'refresh failed' : ago(s.last_success)}`, title: s.last_error ?? '' })
  return el('div', {},
    head('Home', h.window.label, ...refreshButtons()),
    el('div', { class: 'grid g4' },
      el('div', { class: 'card metric' }, el('div', { class: 'label', text: 'Revenue · 30d' }, tip('Item sales after discounts, excluding shipping and tax. Paid, non-cancelled orders.')), el('div', { class: 'value', text: money(m.revenue.value) }), delta(m.revenue.change)),
      el('div', { class: 'card metric' }, el('div', { class: 'label', text: 'Orders · 30d' }), el('div', { class: 'value', text: num(m.orders.value) }), delta(m.orders.change)),
      el('div', { class: 'card metric' }, el('div', { class: 'label', text: 'Conversion' }, tip(m.conversion.note)), el('div', { class: 'value muted', text: 'n/a' }), el('span', { class: 'delta muted', text: 'Shop Stats only' })),
      el('div', { class: 'card metric' }, el('div', { class: 'label', text: 'Active listings' }), el('div', { class: 'value', text: num(m.active_listings.value) }), el('span', { class: 'delta muted', text: ' ' })),
    ),
    el('div', { class: 'row small freshness' }, fresh('Etsy', src.etsy), fresh('Research', src.research), src.insights?.n ? chip(`Marketplace Insights · ${date(src.insights.at)}`, 'src') : null),
    el('div', { class: 'grid g3', id: 'home-queues' },
      el('section', { class: 'card' }, el('h2', { text: 'Fix next' }),
        h.fix_next.length ? el('ul', { class: 'list' }, h.fix_next.map((f) => el('li', {}, chip(f.impact, f.impact), el('div', { class: 'grow' }, el('div', { class: 'trunc', text: f.title }), el('div', { class: 'small muted', text: f.reason })), el('button', { type: 'button', class: 'link', text: 'Review', onclick: () => openListing(f.listing_id) })))) : el('p', { class: 'muted', text: 'No open issues.' })),
      el('section', { class: 'card' }, el('h2', { text: 'Make next' }),
        h.make_next.length ? el('ul', { class: 'list' }, h.make_next.map((k) => el('li', {}, scoreChip(k.score), el('div', { class: 'grow' }, el('div', { class: 'trunc', text: k.keyword }), el('div', { class: 'small muted', text: k.angle })), el('button', { type: 'button', class: 'link', text: 'Brief', onclick: () => (location.hash = `#/create?keyword=${encodeURIComponent(k.keyword)}`) })))) : el('p', { class: 'muted', text: 'Refresh research to find opportunities.' })),
      el('section', { class: 'card' }, el('h2', { text: 'Drafts to review' }),
        h.drafts.review.length ? el('ul', { class: 'list' }, h.drafts.review.map((d) => el('li', {}, el('div', { class: 'grow trunc', text: d.title }), statusChip(d.status), el('button', { type: 'button', class: 'link', text: 'Open', onclick: () => openDraft(d.id) })))) : el('p', { class: 'muted', text: h.drafts.in_progress ? `${h.drafts.in_progress} draft(s) in progress.` : 'No drafts waiting.' }),
        h.drafts.stale ? el('p', { class: 'small', text: `${h.drafts.stale} draft(s) untouched for 14+ days.` }) : null,
        src.etsy.last_error ? el('p', { class: 'err', text: `Etsy refresh failed: ${src.etsy.last_error}` }) : null,
        src.research.last_error ? el('p', { class: 'err', text: `Research refresh failed: ${src.research.last_error}` }) : null),
    ),
  )
}

// ---------- OPTIMIZE ----------
async function viewOptimize(qs) {
  const { rows } = await api('GET', '/api/optimize')
  const q = el('input', { type: 'search', placeholder: 'Search listings', 'aria-label': 'Search listings', value: qs.get('q') ?? '' })
  const impact = el('select', { 'aria-label': 'Impact' }, el('option', { value: '', text: 'All impact' }), ['high', 'medium', 'low'].map((v) => el('option', { value: v, text: label(v) })))
  const staged = el('select', { 'aria-label': 'Status' }, el('option', { value: '', text: 'All listings' }), el('option', { value: 'staged', text: 'Has staged changes' }), el('option', { value: 'hero', text: 'Proven listings' }))
  const holder = el('div', { class: 'card flush' })
  const draw = () => {
    const t = q.value.toLowerCase()
    const filtered = rows.filter((r) => (!t || r.title.toLowerCase().includes(t)) && (!impact.value || r.impact === impact.value) && (!staged.value || (staged.value === 'staged' ? r.staged > 0 : r.hero)))
    clear(holder).append(sortableTable([
      { key: 'title', label: 'Listing', render: (r) => el('div', { class: 'title trunc', title: r.title }, r.hero ? chip('proven', 'good') : null, r.hero ? ' ' : null, r.title) },
      { key: 'score', label: 'SEO score', num: true, tip: 'Average of visibility, keyword coverage and clarity. Open a row for components and sources.', render: (r) => scoreChip(r.score) },
      { key: 'priority', label: 'Impact', tip: 'Severity × sales potential × confidence × freshness, summed over open suggestions.', render: (r) => (r.impact === 'none' ? chip('—') : chip(r.impact, r.impact)) },
      { key: 'main_issue', label: 'Main issue', render: (r) => (r.main_issue ? label(r.main_issue) : '—') },
      { key: 'units_12m', label: 'Sales proof', num: true, tip: 'Units sold in the last 12 months (your Etsy orders).', render: (r) => `${num(r.units_12m)} sold` },
      { key: 'open', label: 'Action', sort: false, render: (r) => el('button', { type: 'button', class: r.staged ? 'primary' : '', text: r.staged ? `Apply ${r.staged}` : 'Review', onclick: () => openListing(r.listing_id) }) },
    ], filtered, { onRow: (r) => openListing(r.listing_id), initial: { key: 'priority', dir: 'desc' } }))
  }
  ;[q, impact, staged].forEach((n) => n.addEventListener('input', draw))
  draw()
  const reaudit = el('button', { type: 'button', text: 'Re-run audit' })
  reaudit.onclick = () => run(reaudit, () => api('POST', '/api/audit'), 'Audit refreshed').then(route)
  return el('div', {}, head('Optimize', 'Listing fixes ranked by likely impact on proven sales.', reaudit), el('div', { class: 'filters opt' }, q, impact, staged), holder)
}

async function openListing(id) {
  openDrawer('Listing', async (d) => {
    const data = await api('GET', `/api/optimize/${id}`)
    d.setTitle(data.listing.title)
    const comps = Object.values(data.components)
    const recs = data.recommendations
    const body = d.body
    put(body, 
      el('div', { class: 'row' }, scoreChip(data.score), el('span', { class: 'muted', text: `${num(data.evidence.units_12m)} sold · ${money(data.evidence.revenue_12m_minor)} · ${num(data.evidence.favorites)} favourites (12 months)` }), data.evidence.hero ? chip('proven listing', 'good') : null),
      el('div', { class: 'card stack' },
        comps.map((c) => el('div', { class: 'comp' }, el('div', {}, el('div', { class: 'row' }, el('strong', { text: c.label }), chip(c.source, 'src')), el('div', { class: 'bar' }, (() => { const s = el('span'); s.style.width = `${c.score ?? 0}%`; return s })()), c.missing?.length ? el('div', { class: 'small muted', text: `Missing research phrases: ${c.missing.join(', ')}` }) : null), el('strong', { class: 'num', text: c.score ?? 'n/a' }))),
        el('div', { class: 'small muted', text: `Data unavailable: ${data.unavailable.join(' · ')}` }),
      ),
      el('h3', { text: 'Suggestions' }),
    )
    if (!recs.length) put(body, el('p', { class: 'muted', text: 'No suggestions for this listing.' }))
    for (const r of recs) put(body, recCard(r, data.listing))
    if (data.changes.length) {
      put(body, el('h3', { text: 'Change history' }), el('ul', { class: 'list' }, data.changes.map((c) => el('li', {}, el('div', { class: 'grow' }, el('strong', { text: label(c.field) }), ' ', el('span', { class: 'muted small', text: `${date(c.applied_at)} · ${c.readback_ok ? 'verified on Etsy' : 'not verified'}` })), chip(c.readback_ok ? 'applied' : 'check', c.readback_ok ? 'good' : 'warn')))))
    }
    const staged = recs.filter((r) => r.status === 'staged')
    const foot = el('footer')
    const apply = el('button', { type: 'button', class: 'primary', text: staged.length ? `Apply ${staged.length} staged change${staged.length > 1 ? 's' : ''}…` : 'Stage a change to apply', disabled: !staged.length })
    apply.onclick = () => applyStaged(data, staged)
    const link = data.listing.url ? el('a', { class: 'btn', href: data.listing.url, target: '_blank', rel: 'noopener noreferrer', text: 'Open on Etsy' }) : null
    put(foot, link, el('span', { class: 'spacer' }), apply)
    d.body.after(foot)
  })
}

function valueView(v, field, compareTo) {
  if (Array.isArray(v)) {
    const old = new Set((compareTo ?? []).map((x) => String(x).toLowerCase()))
    return el('div', { class: 'tags' }, v.map((t) => chip(t, compareTo && !old.has(String(t).toLowerCase()) ? 'new' : '')))
  }
  if (v === null || v === undefined || v === '') return el('span', { class: 'muted', text: '(empty)' })
  const s = String(v)
  return el('span', { text: field === 'description' && s.length > 400 ? s.slice(0, 400) + '…' : s })
}

function recCard(r, listing) {
  const card = el('div', { class: `rec ${r.status}` })
  const draw = () => {
    card.className = `rec ${r.status}`
    clear(card).append(
      el('div', { class: 'row' }, el('strong', { text: label(r.issue_type) }), chip(r.impact, r.impact), chip(`${Math.round(r.confidence * 100)}% confidence`), chip(r.source, 'src'), el('span', { class: 'spacer' }), chip(r.status, r.status === 'staged' ? 'info' : r.status === 'applied' ? 'good' : '')),
      el('p', { class: 'small', text: r.reason }),
      el('div', { class: 'diff' }, el('div', { class: 'k', text: 'Now' }), el('div', { class: Array.isArray(r.current_value) ? '' : 'before' }, valueView(r.current_value, r.field)), el('div', { class: 'k', text: 'Suggested' }), el('div', { class: 'after' }, valueView(r.proposed_value, r.field, Array.isArray(r.current_value) ? r.current_value : null))),
      el('div', { class: 'row' },
        r.automatable ? null : el('span', { class: 'small muted', text: 'Change this in Etsy directly.' }),
        el('span', { class: 'spacer' }),
        r.status === 'applied' ? null : r.status === 'dismissed' || r.status === 'staged' ? el('button', { type: 'button', text: 'Restore', onclick: () => setStatus('suggested') }) : el('button', { type: 'button', text: 'Dismiss', onclick: () => setStatus('dismissed') }),
        r.automatable && r.status === 'suggested' ? el('button', { type: 'button', class: 'primary', text: 'Stage', onclick: () => setStatus('staged') }) : null,
      ),
    )
  }
  const setStatus = async (status) => {
    const n = await run(null, () => api('POST', `/api/recommendations/${r.id}/status`, { status }))
    Object.assign(r, n)
    draw()
    const ap = document.querySelector('.drawer footer .primary')
    const count = document.querySelectorAll('.drawer .rec.staged').length
    if (ap) {
      ap.disabled = !count
      ap.textContent = count ? `Apply ${count} staged change${count > 1 ? 's' : ''}…` : 'Stage a change to apply'
      ap.onclick = async () => openListingApply(listing.listing_id)
    }
  }
  draw()
  return card
}
async function openListingApply(listingId) {
  const data = await api('GET', `/api/optimize/${listingId}`)
  applyStaged(data, data.recommendations.filter((r) => r.status === 'staged'))
}

async function applyStaged(data, staged) {
  const byField = new Map()
  for (const r of staged) byField.set(r.field, r)
  if (byField.size !== staged.length) return toast('Stage only one change per field.', 'error')
  const hero = staged.some((r) => r.hero)
  const heroBox = el('input', { type: 'checkbox', id: 'hero-ok' })
  const content = el('div', { class: 'stack' },
    el('p', { text: `These fields on “${data.listing.title}” will be updated on Etsy. A backup is saved first and the listing is read back afterwards.` }),
    el('ul', {}, staged.map((r) => el('li', {}, el('strong', { text: label(r.field) }), ` — ${r.reason}`))),
    hero ? el('label', { class: 'check' }, heroBox, 'I have reviewed this proven listing and want to change it') : null,
    S.session.shop.is_demo ? el('p', { class: 'small muted', text: 'Demo: changes go to the offline demo shop.' }) : null,
  )
  const ok = await confirmDialog('Apply changes to Etsy?', content, { confirmLabel: `Apply ${staged.length}`, validate: () => !hero || heroBox.checked })
  if (!ok) return
  const r = await run(null, () => api('POST', `/api/listings/${data.listing.listing_id}/apply`, { recommendation_ids: staged.map((s) => s.id), confirm: true, acknowledge_hero: hero && heroBox.checked }))
  const bad = r.results.filter((x) => !x.ok)
  toast(bad.length ? `Etsy didn't keep: ${bad.map((b) => b.field).join(', ')}` : 'Applied and verified on Etsy', bad.length ? 'error' : '')
  openListing(data.listing.listing_id)
}

// ---------- RESEARCH ----------
async function viewResearch(qs) {
  const state = { q: qs.get('q') ?? '', theme: '', min_score: '', min_confidence: '', mode: '', source: '' }
  const holder = el('div', { class: 'card flush' })
  const top = el('div', { class: 'grid g3' })
  const q = el('input', { type: 'search', placeholder: 'Search keywords', 'aria-label': 'Search keywords', value: state.q })
  const theme = el('select', { 'aria-label': 'Theme' }, el('option', { value: '', text: 'All themes' }))
  const minScore = el('select', { 'aria-label': 'Minimum opportunity' }, [['', 'Any score'], ['50', '50+'], ['65', '65+'], ['80', '80+']].map(([v, t]) => el('option', { value: v, text: t })))
  const minConf = el('select', { 'aria-label': 'Minimum confidence' }, [['', 'Any confidence'], ['medium', 'Medium+'], ['high', 'High']].map(([v, t]) => el('option', { value: v, text: t })))
  const source = el('select', { 'aria-label': 'Source' }, [['', 'All sources'], ['krafie', 'Krafie'], ['insights', 'Marketplace Insights']].map(([v, t]) => el('option', { value: v, text: t })))
  const modeBtns = [['', 'All'], ['new', 'New product'], ['optimize', 'Optimize existing']].map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(state.mode === v), text: t, onclick: () => { state.mode = v; modeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(['', 'new', 'optimize'][i] === v))); load() } }))
  let themesLoaded = false
  async function load() {
    const p = new URLSearchParams(Object.entries(state).filter(([, v]) => v))
    const r = await api('GET', `/api/research?${p}`)
    if (!themesLoaded) {
      theme.append(...r.themes.map((t) => el('option', { value: t, text: label(t) })))
      themesLoaded = true
    }
    clear(top).append(...(r.top.length ? r.top : []).map((k) => el('div', { class: 'card' },
      el('div', { class: 'row' }, scoreChip(k.score), el('strong', { class: 'trunc', text: k.keyword }), el('span', { class: 'spacer' }), chip(k.confidence, k.confidence === 'high' ? 'good' : k.confidence === 'medium' ? 'info' : '')),
      el('p', { class: 'small muted', text: k.angle }),
      el('div', { class: 'row' }, el('button', { type: 'button', class: 'primary', text: 'Create product brief', onclick: () => (location.hash = `#/create?keyword=${encodeURIComponent(k.keyword)}`) }), el('button', { type: 'button', text: 'Evidence', onclick: () => openKeyword(k.keyword) })))))
    const hasOfficial = r.rows.some((x) => x.official)
    clear(holder).append(sortableTable([
      { key: 'keyword', label: 'Keyword', render: (k) => el('div', {}, el('div', { class: 'title trunc', text: k.keyword }), k.theme ? el('div', { class: 'small muted', text: label(k.theme) }) : null) },
      { key: 'score', label: 'Opportunity', num: true, tip: 'Weighted: internal demand, catalogue scarcity, Krafie signal, and official Insights when imported. Open a row for the formula.', render: (k) => scoreChip(k.score) },
      { key: 'demand', label: 'Demand', num: true, value: (k) => k.official?.searches ?? k.krafie?.demand ?? null, tip: 'Official searches (Marketplace Insights) when imported; otherwise Krafie estimate (0–100).', render: (k) => (k.official?.searches ? el('span', { title: 'Official Etsy Marketplace Insights', text: num(k.official.searches) }) : k.krafie?.demand ?? '—') },
      { key: 'trend', label: 'Trend', num: true, value: (k) => k.krafie?.trend ?? null, tip: 'Krafie estimate (0–100).', render: (k) => k.krafie?.trend ?? '—' },
      { key: 'competition', label: 'Competition', num: true, value: (k) => k.official?.listing_count ?? k.krafie?.competition ?? null, tip: 'Official listing count when imported; otherwise Krafie estimate (0–100, higher = more crowded).', render: (k) => (k.official?.listing_count ? num(k.official.listing_count) : k.krafie?.competition ?? '—') },
      { key: 'units_12m', label: 'Shop proof', num: true, tip: 'Units you sold in 12 months from listings matching every word of the keyword.', render: (k) => (k.units_12m ? `${num(k.units_12m)} · ${money(k.revenue_12m_minor)}` : '—') },
      { key: 'catalog_matches', label: 'Catalogue', num: true, tip: 'Active listings matching the keyword.', render: (k) => num(k.catalog_matches) },
      hasOfficial ? { key: 'official', label: 'Source', value: (k) => (k.official ? 1 : 0), render: (k) => (k.official ? chip('Insights', 'good') : chip('Krafie est.', 'src')) } : null,
      { key: 'confidence', label: 'Confidence', value: (k) => ({ high: 2, medium: 1, exploratory: 0 })[k.confidence], render: (k) => chip(k.confidence, k.confidence === 'high' ? 'good' : k.confidence === 'medium' ? 'info' : '') },
    ].filter(Boolean), r.rows, { onRow: (k) => openKeyword(k.keyword), initial: { key: 'score', dir: 'desc' }, empty: 'No keywords match. Refresh research or loosen the filters.' }))
  }
  q.addEventListener('input', () => { state.q = q.value; clearTimeout(load.t); load.t = setTimeout(load, 200) })
  for (const [n, k] of [[theme, 'theme'], [minScore, 'min_score'], [minConf, 'min_confidence'], [source, 'source']]) n.addEventListener('change', () => { state[k] = n.value; load() })
  await load()
  const imp = el('button', { type: 'button', text: 'Import Insights', onclick: openInsightsImport })
  return el('div', {}, head('Research', 'Keyword and product gaps from your sales and market signals.', imp, ...refreshButtons().slice(1)),
    top,
    el('div', { class: 'row mb' }, el('div', { class: 'seg', role: 'group', 'aria-label': 'Goal' }, modeBtns)),
    el('div', { class: 'filters' }, q, theme, minScore, minConf, source),
    holder,
    el('p', { class: 'small muted', text: 'Krafie values are third-party estimates, not official Etsy search volume. Official figures appear only from imported Marketplace Insights.' }))
}

async function openKeyword(kw) {
  openDrawer(kw, async (d) => {
    const k = await api('GET', `/api/research/keyword/${encodeURIComponent(kw)}`)
    put(d.body, 
      el('div', { class: 'row' }, scoreChip(k.score), chip(k.confidence, k.confidence === 'high' ? 'good' : 'info'), k.theme ? chip(label(k.theme)) : null, chip(label(k.mode))),
      k.freshness?.warning ? el('p', { class: 'err', text: k.freshness.warning }) : null,
      el('p', { text: k.angle }),
      el('div', { class: 'card stack' }, el('h3', { text: 'How the score is built' }), el('code', { text: k.formula }),
        el('dl', { class: 'kv small' },
          el('dt', { text: 'Internal demand' }), el('dd', { text: `${k.components.internal} — ${num(k.units_12m)} units, ${money(k.revenue_12m_minor)} in 12 months` }),
          el('dt', { text: 'Catalogue scarcity' }), el('dd', { text: `${k.components.scarcity} — ${k.catalog_matches} matching active listings` }),
          el('dt', { text: 'Krafie signal' }), el('dd', { text: k.components.krafie === null ? 'Not available' : `${k.components.krafie} (third-party estimate)` }),
          el('dt', { text: 'Official Insights' }), el('dd', { text: k.components.official === null ? 'Not imported' : `${k.components.official} — ${num(k.official.searches)} searches / ${num(k.official.listing_count)} listings (${date(k.official.captured_at)})` }))),
      k.krafie ? el('div', { class: 'card' }, el('h3', { text: 'Krafie metrics · estimate' }), el('dl', { class: 'kv small' },
        ...['opportunity', 'demand', 'trend', 'competition', 'est_sales'].flatMap((m) => [el('dt', { text: label(m) }), el('dd', { text: k.krafie[m] ?? 'Not returned' })]),
        el('dt', { text: 'Captured' }), el('dd', { text: date(k.captured_at) })),
        k.evidence.samples.length ? el('ul', { class: 'list small' }, k.evidence.samples.map((s) => el('li', {}, s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.title ?? s.url }) : el('span', { text: s.title }), s.price ? el('span', { class: 'muted', text: ` · ${s.price}` }) : null))) : null) : null,
      el('div', { class: 'card' }, el('h3', { text: 'Your matching listings' }),
        k.evidence.listings.length ? el('ul', { class: 'list' }, k.evidence.listings.map((l) => el('li', {}, el('span', { class: 'grow trunc', text: l.title }), el('button', { type: 'button', class: 'link', text: 'Optimize', onclick: () => openListing(l.listing_id) })))) : el('p', { class: 'muted', text: 'None — a new product could fill this gap.' }),
        el('h3', { text: `Sales evidence · ${k.evidence.transactions} order lines` }),
        k.evidence.sample_transactions.length ? el('ul', { class: 'list small' }, k.evidence.sample_transactions.map((t) => el('li', {}, el('span', { class: 'grow trunc', text: t.title }), el('span', { class: 'muted', text: `×${t.quantity} · ${t.created_at}` })))) : el('p', { class: 'muted small', text: 'No matching sales in 12 months.' })),
    )
    const foot = el('footer', {},
      el('button', { type: 'button', text: 'Find listing to optimize', disabled: !k.evidence.listings.length, onclick: () => (k.evidence.listings[0] ? openListing(k.evidence.listings[0].listing_id) : null) }),
      el('button', { type: 'button', class: 'primary', autofocus: true, text: 'Create product brief', onclick: () => { closeDrawer(); location.hash = `#/create?keyword=${encodeURIComponent(k.keyword)}` } }))
    d.body.after(foot)
  })
}

function openInsightsImport() {
  openDrawer('Import Marketplace Insights', async (d) => {
    const t = await api('GET', '/api/research/insights-template')
    const ta = el('textarea', { 'aria-label': 'CSV data', value: t.csv, rows: 10 })
    const btn = el('button', { type: 'button', class: 'primary', text: 'Import' })
    btn.onclick = () => run(btn, () => api('POST', '/api/research/insights', { csv: ta.value }), (r) => `Imported ${r.imported} rows${r.errors.length ? `, ${r.errors.length} skipped` : ''}`).then(() => { closeDrawer(); route() })
    put(d.body, 
      el('p', { text: 'Official Etsy figures from Shop Manager → Stats → Marketplace Insights. Paste an export or type values using this header. You can also drop CSV files in data/imports/marketplace-insights/.' }),
      el('p', { class: 'small muted', text: 'Labelled “Official Etsy Marketplace Insights” wherever shown. Never mixed with Krafie estimates.' }),
      ta, el('div', { class: 'row' }, el('span', { class: 'spacer' }), btn))
  })
}

// ---------- CREATE ----------
const STEPS = ['Brief', 'Design', 'Mockups', 'Listing', 'Files', 'Review']
async function viewCreate(qs) {
  const draftId = qs.get('draft')
  const step = Math.max(0, STEPS.indexOf(qs.get('step') ?? '') )
  if (!draftId) return createBrief(qs.get('keyword') ?? '')
  const d = await api('GET', `/api/drafts/${draftId}`)
  const go = (i) => (location.hash = `#/create?draft=${draftId}&step=${STEPS[i]}`)
  const stepper = el('ol', { class: 'stepper', 'aria-label': 'Steps' }, STEPS.map((s, i) => el('li', { class: i < step ? 'done' : '' }, el('button', { type: 'button', 'aria-current': i === step ? 'step' : null, onclick: () => go(i) }, el('span', { class: 'n', text: i + 1 }), s))))
  const body = await [stepBrief, stepDesign, stepMockups, stepListing, stepFiles, stepReview][step](d, go)
  const title = d.fields.title || d.brief?.keyword || 'New product'
  return el('div', {}, head('Create', title, el('a', { class: 'btn', href: '#/drafts', text: 'All drafts' })), stepper, body)
}

function createBrief(keyword) {
  const f = {
    keyword: el('input', { name: 'keyword', value: keyword, required: true }),
    product_type: el('input', { name: 'product_type', placeholder: 'e.g. soy candle, weekly planner' }),
    audience: el('input', { name: 'audience', placeholder: 'e.g. teachers, new mums' }),
    occasion: el('input', { name: 'occasion', placeholder: 'e.g. Christmas, end of year' }),
    style: el('input', { name: 'style', placeholder: 'e.g. minimalist, boho' }),
    notes: el('textarea', { name: 'notes', rows: 3 }),
  }
  let kind = 'digital'
  const kinds = ['digital', 'physical'].map((k) => el('button', { type: 'button', 'aria-pressed': String(k === kind), text: label(k), onclick: () => { kind = k; kinds.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent.toLowerCase() === k))) } }))
  const submit = el('button', { type: 'submit', class: 'primary', text: 'Save brief & continue' })
  const form = el('form', { class: 'card' },
    el('div', { class: 'form' },
      el('div', { class: 'full' }, el('div', { class: 'seg', role: 'group', 'aria-label': 'Product type' }, kinds)),
      el('label', { class: 'field full' }, 'Keyword', f.keyword),
      el('label', { class: 'field' }, 'Product', f.product_type),
      el('label', { class: 'field' }, 'Audience', f.audience),
      el('label', { class: 'field' }, 'Occasion', f.occasion),
      el('label', { class: 'field' }, 'Style', f.style),
      el('label', { class: 'field full' }, 'Notes', f.notes)),
    el('div', { class: 'row' }, el('span', { class: 'spacer' }), submit))
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(f).map(([k, n]) => [k, n.value]))
    const r = await run(submit, () => api('POST', '/api/briefs', { ...body, product_kind: kind }), 'Brief saved')
    location.hash = `#/create?draft=${r.draft.id}&step=Design`
  })
  return el('div', {}, head('Create', 'Brief → design → mockups → listing → files → review.'), el('ol', { class: 'stepper' }, STEPS.map((s, i) => el('li', {}, el('button', { type: 'button', 'aria-current': i === 0 ? 'step' : null, disabled: i > 0 }, el('span', { class: 'n', text: i + 1 }), s)))), form)
}

function stepBrief(d) {
  const b = d.brief
  return el('div', { class: 'card' }, b ? el('dl', { class: 'kv' }, ...['keyword', 'product_kind', 'product_type', 'audience', 'occasion', 'style', 'notes'].flatMap((k) => [el('dt', { text: label(k) }), el('dd', { text: b[k] || '—' })])) : el('p', { class: 'muted', text: 'This draft was created without a brief.' }))
}

async function assetLibrary({ filter, selected = new Set(), onPick, pickLabel = 'Use' } = {}) {
  const list = await api('GET', '/api/assets')
  const items = list.filter((a) => !filter || filter(a))
  if (!items.length) return el('p', { class: 'muted', text: 'No media yet.' })
  return el('div', { class: 'assets' }, items.map((a) => el('div', { class: `asset ${selected.has(a.id) ? 'selected' : ''}` },
    a.kind === 'image' ? el('img', { src: `/api/assets/${a.id}/file`, alt: a.filename, loading: 'lazy' }) : el('div', { class: 'file', text: a.mime.split('/')[1].toUpperCase() }),
    el('div', { class: 'meta' }, el('span', { class: 'trunc', text: a.filename }), el('span', { class: 'muted', text: `${a.width ? `${a.width}×${a.height} · ` : ''}${Math.round(a.size / 1024)} KB · ${a.source}` }),
      onPick ? el('button', { type: 'button', text: selected.has(a.id) ? 'Added' : pickLabel, disabled: selected.has(a.id), onclick: () => onPick(a) }) : null))))
}

function uploadButton(accept, onDone, text = 'Upload') {
  const input = el('input', { type: 'file', accept, class: 'sr-only', 'aria-label': text })
  const btn = el('button', { type: 'button', text, onclick: () => input.click() })
  input.addEventListener('change', async () => {
    for (const file of input.files) {
      const a = await run(btn, () => api('POST', '/api/assets', undefined, { raw: { body: file, headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': 'application/octet-stream' } } }), `Uploaded ${file.name}`)
      await onDone?.(a)
    }
    input.value = ''
  })
  return el('span', {}, btn, input)
}

function jobWidget(kind, extra = {}, onComplete) {
  const box = el('div', { class: 'stack' })
  const prompt = kind === 'mockup' ? null : el('textarea', { rows: 3, placeholder: 'Describe an original design — no brands, characters or celebrities.', 'aria-label': 'Prompt' })
  const aspect = kind === 'mockup' ? null : el('select', { 'aria-label': 'Aspect ratio' }, ['1:1', '4:5', '3:4', '16:9'].map((v) => el('option', { value: v, text: v })))
  const dur = kind === 'video' ? el('select', { 'aria-label': 'Duration' }, ['5', '10', '15'].map((v) => el('option', { value: v, text: `${v}s` }))) : null
  const est = el('button', { type: 'button', class: 'primary', text: 'Estimate cost' })
  est.onclick = async () => {
    const job = await run(est, () => api('POST', '/api/creative/estimate', { kind, prompt: prompt?.value, aspect_ratio: aspect?.value, duration: dur?.value, ...extra() }))
    const e = job.cost_estimate ?? {}
    const ok = await confirmDialog(`Generate ${kind}?`, el('div', { class: 'stack' },
      el('p', { text: e.unavailable ? e.note : `Estimated cost: ${e.credits ?? e.cost ?? e.amount ?? '?'} ${e.currency ?? 'credits'}${e.note ? ` — ${e.note}` : ''}` }),
      kind === 'video' ? el('p', { class: 'small muted', text: 'Videos take a few minutes. You can leave this page; the job keeps its place.' }) : null,
      el('p', { class: 'small muted', text: 'Submitted once. Retrying never re-charges the same job.' })), { confirmLabel: 'Generate' })
    if (!ok) return
    let j = await run(null, () => api('POST', `/api/creative/jobs/${job.id}/confirm`, { confirm: true }))
    renderJobs()
    for (let i = 0; i < 40 && j.status === 'pending'; i++) {
      await new Promise((r) => setTimeout(r, Math.min(15000, 2000 * (i + 1))))
      j = await api('POST', `/api/creative/jobs/${job.id}/poll`)
    }
    renderJobs()
    if (j.status === 'completed') {
      toast(`${label(kind)} ready`)
      onComplete?.(j)
    } else if (j.status !== 'pending') toast(j.error ?? `Job ${j.status}`, 'error')
  }
  const jobs = el('div')
  async function renderJobs() {
    const { jobs: all } = await api('GET', '/api/creative')
    const mine = all.filter((x) => x.kind === kind && x.status !== 'estimated').slice(0, 5)
    clear(jobs).append(mine.length ? el('ul', { class: 'list small' }, mine.map((x) => el('li', {}, el('span', { class: 'grow trunc', text: x.params.prompt ?? x.params.template_id ?? x.id }), chip(x.status, x.status === 'completed' ? 'good' : x.status === 'failed' ? 'bad' : x.status === 'unknown' ? 'warn' : 'info'),
      x.status === 'pending' ? el('button', { type: 'button', class: 'link', text: 'Check', onclick: async () => { await api('POST', `/api/creative/jobs/${x.id}/poll`); renderJobs(); onComplete?.() } }) : null,
      x.status === 'unknown' ? el('span', { class: 'muted', title: 'Submission outcome unknown — check Krafie before generating again.', text: 'check Krafie' }) : null))) : '')
  }
  renderJobs()
  box.append(prompt, el('div', { class: 'row' }, aspect, dur, el('span', { class: 'spacer' }), est), jobs)
  return box
}

async function stepDesign(d, go) {
  const lib = el('div')
  const refresh = async () => clear(lib).append(await assetLibrary({ filter: (a) => a.kind === 'image' }))
  await refresh()
  return el('div', { class: 'grid g2' },
    el('section', { class: 'card' }, el('h2', { text: 'Generate with Krafie' }), el('p', { class: 'small muted', text: 'Cost is shown before anything is charged.' }), jobWidget('image', () => ({}), refresh)),
    el('section', { class: 'card' }, el('div', { class: 'row' }, el('h2', { text: 'Your media' }), el('span', { class: 'spacer' }), uploadButton('image/png,image/jpeg,image/webp', refresh, 'Upload design')), el('p', { class: 'small muted', text: 'Shows Krafie media generated through this app and your uploads.' }), lib,
      el('div', { class: 'row' }, el('span', { class: 'spacer' }), el('button', { type: 'button', class: 'primary', text: 'Next: mockups', onclick: () => go(2) }))))
}

async function stepMockups(d, go) {
  const { templates } = await api('GET', '/api/creative')
  const design = el('select', { 'aria-label': 'Design' })
  const assets = (await api('GET', '/api/assets')).filter((a) => a.kind === 'image')
  design.append(...assets.map((a) => el('option', { value: a.id, text: `${a.filename} (${a.source})` })))
  const template = el('select', { 'aria-label': 'Mockup template' }, templates.map((t) => el('option', { value: t.id, text: `${t.label} · ${t.for}` })))
  const chosen = new Set(d.assets.filter((a) => a.role === 'image').map((a) => a.asset_id))
  const lib = el('div')
  const refresh = async () => clear(lib).append(await assetLibrary({ filter: (a) => a.kind === 'image', selected: chosen, pickLabel: 'Add to listing', onPick: async (a) => {
    const alt = (d.fields.title || d.brief?.keyword || a.filename).slice(0, S.session.limits.altTextMaxChars)
    await run(null, () => api('POST', `/api/drafts/${d.id}/assets`, { asset_id: a.id, role: 'image', alt_text: alt }), 'Added as listing image')
    chosen.add(a.id)
    refresh()
  } }))
  await refresh()
  return el('div', { class: 'grid g2' },
    el('section', { class: 'card' }, el('h2', { text: 'Make a mockup' }), assets.length ? el('div', { class: 'stack' }, el('label', { class: 'field' }, 'Design', design), el('label', { class: 'field' }, 'Template', template), jobWidget('mockup', () => ({ asset_id: design.value, template_id: template.value }), refresh)) : el('p', { class: 'muted', text: 'Add a design first.' })),
    el('section', { class: 'card' }, el('h2', { text: 'Listing images' }), el('p', { class: 'small muted', text: `First added is the primary photo. Up to ${S.session.limits.imagesMax}.` }), lib,
      el('div', { class: 'row' }, el('span', { class: 'spacer' }), el('button', { type: 'button', class: 'primary', text: 'Next: listing', onclick: () => go(3) }))))
}

async function stepListing(d, go) {
  const refs = await api('GET', '/api/refs')
  const f = d.fields
  const physical = f.type === 'physical'
  const errs = new Map(d.updated_at !== d.created_at ? d.validation.errors.map((e) => [e.field, e.msg]) : [])
  const inputs = {}
  const field = (name, lbl, node, { full, hint } = {}) => {
    inputs[name] = node
    node.id = `f-${name}`
    return el('label', { class: `field ${full ? 'full' : ''}`, for: node.id }, lbl, hint ? el('span', { class: 'hint', text: hint }) : null, node, errs.get(name) ? el('span', { class: 'err', text: errs.get(name) }) : null)
  }
  const opt = (list, val, empty = 'Choose…') => [el('option', { value: '', text: empty }), ...(list ?? []).map((x) => el('option', { value: x.id, text: x.name, selected: String(x.id) === String(val) ? true : null }))]
  const enumSel = (list, val) => list.map((v) => el('option', { value: v, text: label(v), selected: v === val ? true : null }))
  const titleIn = el('input', { value: f.title, maxlength: S.session.limits.titleMaxChars })
  const titleCount = el('span', { class: 'hint', text: `${f.title.length}/${S.session.limits.titleMaxChars}` })
  titleIn.addEventListener('input', () => (titleCount.textContent = `${titleIn.value.length}/${S.session.limits.titleMaxChars}`))
  const desc = el('textarea', { rows: 8, value: f.description })
  const tags = el('input', { value: f.tags.join(', ') })
  const taxSearch = el('input', { type: 'search', placeholder: 'Search categories', 'aria-label': 'Search categories' })
  const tax = el('select', {}, el('option', { value: f.taxonomy_id ?? '', text: f.taxonomy_id ? `Category #${f.taxonomy_id}` : 'Choose a category…' }))
  const loadTax = async () => {
    const list = await api('GET', `/api/taxonomy?q=${encodeURIComponent(taxSearch.value)}`)
    const cur = tax.value
    clear(tax).append(el('option', { value: '', text: 'Choose a category…' }), ...list.map((t) => el('option', { value: t.id, text: `${t.path}${t.is_leaf ? '' : ' (broad)'}`, selected: String(t.id) === String(cur || f.taxonomy_id) ? true : null })))
  }
  taxSearch.addEventListener('input', () => { clearTimeout(loadTax.t); loadTax.t = setTimeout(loadTax, 200) })
  loadTax()

  const gen = el('button', { type: 'button', text: 'Generate listing copy' })
  const suggestions = el('div')
  gen.onclick = async () => {
    const g = await run(gen, () => api('POST', `/api/drafts/${d.id}/generate`))
    const use = (t) => { titleIn.value = t; titleIn.dispatchEvent(new Event('input')) }
    clear(suggestions).append(el('div', { class: 'card stack' },
      el('div', { class: 'row' }, el('strong', { text: 'Recommended' }), el('span', { class: 'spacer' }), el('button', { type: 'button', class: 'primary', text: 'Use all', onclick: () => { use(g.recommended.title); tags.value = g.recommended.tags.join(', '); desc.value = g.recommended.description } })),
      el('div', { text: g.recommended.title }), el('div', { class: 'tags' }, g.recommended.tags.map((t) => chip(t))),
      g.alternatives.length ? el('div', { class: 'small' }, el('span', { class: 'muted', text: 'Alternative titles: ' }), g.alternatives.map((a) => el('button', { type: 'button', class: 'link', text: a, onclick: () => use(a) })).flatMap((b, i) => (i ? [' · ', b] : [b]))) : null))
  }

  const form = el('form', {},
    el('div', { class: 'row' }, gen, el('span', { class: 'small muted', text: 'One recommended version plus alternatives, from your brief and research.' })), suggestions,
    el('fieldset', {}, el('legend', { text: 'Core details' }), el('div', { class: 'form' },
      el('label', { class: 'field full', for: 'f-title' }, el('span', { class: 'row' }, 'Title', el('span', { class: 'spacer' }), titleCount), (inputs.title = titleIn, titleIn.id = 'f-title', titleIn), errs.get('title') ? el('span', { class: 'err', text: errs.get('title') }) : null),
      field('description', 'Description', desc, { full: true }),
      field('tags', 'Tags', tags, { full: true, hint: `Comma-separated, up to ${S.session.limits.tagsMax}, ${S.session.limits.tagMaxChars} characters each.` }),
      field('materials', 'Materials', el('input', { value: f.materials.join(', ') }), { full: true, hint: 'Comma-separated.' }),
      el('div', { class: 'field full' }, el('span', { text: 'Category' }), taxSearch, (inputs.taxonomy_id = tax), errs.get('taxonomy_id') ? el('span', { class: 'err', text: errs.get('taxonomy_id') }) : null),
      field('who_made', 'Who made it', el('select', {}, enumSel(S.session.enums.who_made, f.who_made))),
      field('when_made', 'When was it made', el('select', {}, enumSel(S.session.enums.when_made, f.when_made))),
      field('is_supply', 'What is it', el('select', {}, el('option', { value: 'false', text: 'A finished product', selected: !f.is_supply ? true : null }), el('option', { value: 'true', text: 'A supply or tool', selected: f.is_supply ? true : null }))),
      field('shop_section_id', 'Shop section', el('select', {}, opt(refs.section, f.shop_section_id, 'None'))))),
    el('fieldset', {}, el('legend', { text: 'Price & inventory' }), el('div', { class: 'form' },
      field('price', 'Price', el('input', { type: 'number', step: '0.01', min: S.session.limits.minPrice, value: f.price ?? '' })),
      field('quantity', 'Quantity', el('input', { type: 'number', min: 1, max: S.session.limits.quantityMax, value: f.quantity })),
      field('sku', 'SKU', el('input', { value: f.sku })),
      field('should_auto_renew', 'Renewal', el('select', {}, el('option', { value: 'true', text: 'Automatic', selected: f.should_auto_renew ? true : null }), el('option', { value: 'false', text: 'Manual', selected: !f.should_auto_renew ? true : null }))),
      field('is_taxable', 'Tax', el('select', {}, el('option', { value: 'true', text: 'Taxable', selected: f.is_taxable ? true : null }), el('option', { value: 'false', text: 'Not taxable', selected: !f.is_taxable ? true : null }))))),
    physical ? el('fieldset', {}, el('legend', { text: 'Delivery' }), el('div', { class: 'form' },
      field('shipping_profile_id', 'Shipping profile', el('select', {}, opt(refs.shipping_profile, f.shipping_profile_id))),
      field('readiness_state_id', 'Processing profile', el('select', {}, opt(refs.readiness_state, f.readiness_state_id))),
      field('return_policy_id', 'Return policy', el('select', {}, opt(refs.return_policy, f.return_policy_id, 'None'))),
      field('production_partner_ids', 'Production partner', el('select', {}, opt(refs.production_partner, f.production_partner_ids?.[0], 'None'))),
      field('item_weight', 'Weight', el('input', { type: 'number', step: '0.01', value: f.item_weight ?? '' })),
      field('item_weight_unit', 'Weight unit', el('select', {}, enumSel(['oz', 'lb', 'g', 'kg'], f.item_weight_unit))),
      field('item_length', 'Length', el('input', { type: 'number', step: '0.1', value: f.item_length ?? '' })),
      field('item_width', 'Width', el('input', { type: 'number', step: '0.1', value: f.item_width ?? '' })),
      field('item_height', 'Height', el('input', { type: 'number', step: '0.1', value: f.item_height ?? '' })),
      field('item_dimensions_unit', 'Dimension unit', el('select', {}, enumSel(['in', 'cm', 'mm'], f.item_dimensions_unit))))) : el('p', { class: 'small muted', text: 'Digital listing: buyers download the files you attach in the Files step. No shipping.' }),
    el('fieldset', {}, el('legend', { text: 'Personalisation' }), el('div', { class: 'form' },
      el('label', { class: 'check full' }, (inputs.is_personalizable = el('input', { type: 'checkbox', checked: f.is_personalizable })), 'Buyers can add personalisation'),
      el('label', { class: 'check' }, (inputs.personalization_is_required = el('input', { type: 'checkbox', checked: f.personalization_is_required })), 'Required'),
      field('personalization_char_count_max', 'Character limit', el('input', { type: 'number', min: 1, max: S.session.limits.personalizationCharMax, value: f.personalization_char_count_max ?? '' })),
      field('personalization_instructions', 'Instructions for buyers', el('textarea', { rows: 2, value: f.personalization_instructions }), { full: true }))),
    el('div', { class: 'row' }, el('span', { class: 'spacer' }), el('button', { type: 'submit', class: 'primary', text: 'Save & continue' })))
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const patch = {}
    for (const [k, n] of Object.entries(inputs)) {
      let v = n.type === 'checkbox' ? n.checked : n.value
      if (['is_supply', 'should_auto_renew', 'is_taxable'].includes(k)) v = v === 'true'
      if (['price', 'item_weight', 'item_length', 'item_width', 'item_height'].includes(k)) v = v === '' ? null : Number(v)
      if (['quantity', 'personalization_char_count_max', 'taxonomy_id', 'shop_section_id', 'shipping_profile_id', 'readiness_state_id', 'return_policy_id'].includes(k)) v = v === '' ? null : Number(v)
      if (k === 'production_partner_ids') v = v ? [Number(v)] : []
      patch[k] = v
    }
    const r = await run(e.submitter, () => api('PATCH', `/api/drafts/${d.id}`, { fields: patch }), 'Saved')
    if (r.validation.errors.length) route()
    else go(4)
  })
  return form
}

async function stepFiles(d, go) {
  const digital = d.fields.type === 'download'
  const attached = (role) => d.assets.filter((a) => a.role === role)
  const add = (role) => async (a) => {
    await run(null, () => api('POST', `/api/drafts/${d.id}/assets`, { asset_id: a.id, role }), `Attached ${a.filename}`)
    route()
  }
  const remove = (a) => el('button', { type: 'button', class: 'link', text: 'Remove', disabled: !!a.etsy_ref, onclick: async () => { await run(null, () => api('POST', `/api/drafts/${d.id}/assets/remove`, { asset_id: a.asset_id, role: a.role })); route() } })
  const fileList = (role) => attached(role).length ? el('ul', { class: 'list' }, attached(role).map((a) => el('li', {}, el('span', { class: 'grow trunc', text: a.filename }), el('span', { class: 'muted small', text: `${Math.round(a.size / 1024)} KB` }), a.etsy_ref ? chip('on Etsy', 'good') : null, remove(a)))) : el('p', { class: 'muted', text: 'None attached.' })
  const videoLib = el('div')
  clear(videoLib).append(await assetLibrary({ filter: (a) => a.kind === 'video', selected: new Set(attached('video').map((a) => a.asset_id)), onPick: add('video'), pickLabel: 'Use as video' }))
  return el('div', { class: 'grid g2' },
    digital ? el('section', { class: 'card stack' }, el('h2', { text: 'Digital download' }), el('p', { class: 'small muted', text: `What buyers receive. Up to ${S.session.limits.filesMax} files, ${Math.round(S.session.limits.fileMaxBytes / 1048576)} MB each.` }), fileList('file'), uploadButton('.pdf,.zip,.png,.jpg,.jpeg,.svg', add('file'), 'Upload file')) :
      el('section', { class: 'card' }, el('h2', { text: 'Physical product' }), el('p', { class: 'muted', text: 'Shipping, processing and returns are set in the Listing step.' })),
    el('section', { class: 'card stack' }, el('h2', { text: 'Listing video (optional)' }), el('p', { class: 'small muted', text: '5–15 seconds, MP4 or MOV.' }), fileList('video'), uploadButton('video/mp4,video/quicktime', add('video'), 'Upload video'), el('h3', { text: 'Generate with Krafie' }), jobWidget('video', () => ({}), () => route()), videoLib),
    el('div', { class: 'row full' }, el('span', { class: 'spacer' }), el('button', { type: 'button', class: 'primary', text: 'Next: review', onclick: () => go(5) })))
}

function draftSummary(d) {
  const f = d.fields
  const imgs = d.assets.filter((a) => a.role === 'image')
  const files = d.assets.filter((a) => a.role === 'file')
  return el('div', { class: 'stack' },
    el('dl', { class: 'kv' },
      el('dt', { text: 'Title' }), el('dd', { text: f.title || '—' }),
      el('dt', { text: 'Price' }), el('dd', { text: f.price ? money(Math.round(f.price * 100)) : '—' }),
      el('dt', { text: 'Type' }), el('dd', { text: f.type === 'download' ? 'Digital download' : 'Physical' }),
      el('dt', { text: 'Category' }), el('dd', { text: f.taxonomy_id ? `#${f.taxonomy_id}` : '—' }),
      el('dt', { text: 'Tags' }), el('dd', {}, el('div', { class: 'tags' }, f.tags.map((t) => chip(t)))),
      el('dt', { text: 'Quantity' }), el('dd', { text: f.quantity }),
      d.etsy_listing_id ? [el('dt', { text: 'Etsy listing' }), el('dd', { text: `#${d.etsy_listing_id} ${d.status === 'published' ? '(live)' : '(private draft)'}` })] : null),
    el('h3', { text: `Images · ${imgs.length}` }),
    imgs.length ? el('div', { class: 'thumbs' }, imgs.map((a, i) => el('img', { src: `/api/assets/${a.asset_id}/file`, alt: a.alt_text || `Image ${i + 1}`, title: `${i + 1}. ${a.alt_text ?? ''}` }))) : el('p', { class: 'muted', text: 'No images.' }),
    f.type === 'download' ? [el('h3', { text: 'Files' }), files.length ? el('ul', { class: 'list small' }, files.map((a) => el('li', {}, el('span', { class: 'grow', text: a.filename }), el('span', { class: 'muted', text: `${Math.round(a.size / 1024)} KB` }), a.upload_error ? el('span', { class: 'err', text: a.upload_error }) : null))) : el('p', { class: 'muted', text: 'No files.' })] : null,
    el('h3', { text: 'Description' }), el('div', { class: 'pre', text: f.description || '—' }))
}

function validationView(v) {
  return el('div', { class: 'stack' },
    v.errors.length ? el('ul', { class: 'list' }, v.errors.map((e) => el('li', {}, chip('fix', 'bad'), el('span', { class: 'grow', text: `${label(e.field)}: ${e.msg}` })))) : null,
    v.incomplete.length ? el('ul', { class: 'list' }, v.incomplete.map((m) => el('li', {}, chip('missing', 'warn'), el('span', { class: 'grow', text: m })))) : null,
    v.warnings.length ? el('ul', { class: 'list' }, v.warnings.map((w) => el('li', {}, chip('check', 'info'), el('span', { class: 'grow', text: w.msg })))) : null,
    v.ready ? el('p', { class: 'small', text: '✓ Ready for Etsy.' }) : null)
}

function stagesView(d) {
  const STAGE_LABEL = { create_draft: 'Create Etsy draft', sync_fields: 'Update Etsy draft', images: 'Upload images', video: 'Upload video', files: 'Upload files', inventory: 'SKU & inventory', readback: 'Read back & compare' }
  const keys = Object.keys(STAGE_LABEL).filter((k) => d.stages[k])
  if (!keys.length) return null
  return el('ul', { class: 'timeline' }, keys.map((k) => {
    const s = d.stages[k]
    return el('li', {}, chip(s.status, s.status === 'done' ? 'good' : s.status === 'skipped' ? '' : s.status === 'failed' || s.status === 'mismatch' ? 'bad' : 'warn'), el('span', { text: STAGE_LABEL[k] }), s.error ? el('span', { class: 'err', text: s.error }) : null)
  }))
}

async function stepReview(d) {
  const push = el('button', { type: 'button', class: 'primary', text: d.etsy_listing_id ? 'Send changes / resume' : 'Create Etsy draft', disabled: !d.validation.ready || d.status === 'published' })
  push.onclick = async () => {
    const r = await run(push, () => api('POST', `/api/drafts/${d.id}/push`))
    toast(r.status === 'ready_to_publish' ? 'Private Etsy draft created and verified' : r.last_error ?? label(r.status), r.status === 'ready_to_publish' ? '' : 'error')
    route()
  }
  return el('div', { class: 'grid g2' },
    el('section', { class: 'card' }, el('div', { class: 'row' }, el('h2', { text: 'Listing' }), el('span', { class: 'spacer' }), statusChip(d.status)), draftSummary(d)),
    el('section', { class: 'card stack' }, el('h2', { text: 'Checks' }), validationView(d.validation), stagesView(d), d.last_error ? el('p', { class: 'err', text: d.last_error }) : null,
      el('p', { class: 'small muted', text: 'Creates a private draft on Etsy. It is not published until you approve it in Drafts.' }),
      el('div', { class: 'row' }, el('span', { class: 'spacer' }), push, d.status === 'ready_to_publish' ? el('button', { type: 'button', text: 'Review & publish', onclick: () => openDraft(d.id) }) : null)))
}

// ---------- DRAFTS ----------
async function viewDrafts() {
  const { drafts } = await api('GET', '/api/drafts')
  const newBtn = el('a', { class: 'btn primary', href: '#/create', text: 'New product' })
  return el('div', {}, head('Drafts', 'Review, validate and publish. Publishing is always your call.', newBtn),
    el('div', { class: 'card flush' }, sortableTable([
      { key: 'title', label: 'Draft', value: (d) => d.fields.title, render: (d) => el('div', { class: 'title trunc', text: d.fields.title || 'Untitled draft' }) },
      { key: 'kind', label: 'Type', render: (d) => (d.kind === 'download' ? 'Digital' : 'Physical') },
      { key: 'status', label: 'Status', render: (d) => statusChip(d.status) },
      { key: 'etsy_listing_id', label: 'Etsy', render: (d) => (d.etsy_listing_id ? `#${d.etsy_listing_id}` : '—') },
      { key: 'updated_at', label: 'Updated', render: (d) => ago(d.updated_at) },
      { key: 'id', label: 'Action', sort: false, render: (d) => el('button', { type: 'button', class: d.status === 'ready_to_publish' ? 'primary' : '', text: d.status === 'ready_to_publish' ? 'Review' : 'Open', onclick: () => openDraft(d.id) }) },
    ], drafts, { onRow: (d) => openDraft(d.id), initial: { key: 'updated_at', dir: 'desc' }, empty: 'No drafts yet. Start from Research or Create.' })))
}

function openDraft(id) {
  openDrawer('Draft', async (dr) => {
    const d = await api('GET', `/api/drafts/${id}`)
    dr.setTitle(d.fields.title || 'Untitled draft')
    put(dr.body, 
      el('div', { class: 'row' }, statusChip(d.status), d.etsy_listing_id ? chip(`Etsy #${d.etsy_listing_id}`, 'src') : null),
      d.last_error ? el('p', { class: 'err', text: d.last_error }) : null,
      draftSummary(d),
      el('h3', { text: 'Etsy validation' }), validationView(d.validation), stagesView(d),
      d.readback ? el('div', { class: 'card small' }, el('strong', { text: `Read back ${ago(d.readback.at)}: ` }), d.readback.ok ? 'matches what you reviewed.' : `differs on ${d.readback.mismatches.map((m) => m.field).join(', ')}.`) : null)
    const foot = el('footer')
    const edit = el('a', { class: 'btn', href: `#/create?draft=${d.id}&step=Listing`, text: 'Edit', onclick: closeDrawer })
    const push = el('button', { type: 'button', text: d.etsy_listing_id ? 'Retry / resume' : 'Create Etsy draft', disabled: !d.validation.ready || ['published', 'ready_to_publish'].includes(d.status) })
    push.onclick = async () => {
      const r = await run(push, () => api('POST', `/api/drafts/${d.id}/push`))
      toast(r.status === 'ready_to_publish' ? 'Etsy draft verified' : r.last_error ?? label(r.status), r.status === 'ready_to_publish' ? '' : 'error')
      openDraft(id)
      updateDraftCount()
    }
    const pub = el('button', { type: 'button', class: 'primary', text: 'Publish to Etsy…', disabled: d.status !== 'ready_to_publish' })
    pub.onclick = () => publishFlow(d)
    put(foot, d.status === 'published' ? null : edit, el('span', { class: 'spacer' }), d.status === 'published' ? chip(`Published ${date(d.published_at)}`, 'good') : [push, pub])
    dr.body.after(foot)
  })
}

async function publishFlow(d) {
  const phrase = S.session.publish_phrase
  const typed = el('input', { 'aria-label': `Type ${phrase}`, autocomplete: 'off' })
  const fees = el('input', { type: 'checkbox' })
  const ok = await confirmDialog('Publish this listing?', el('div', { class: 'stack' },
    el('p', {}, el('strong', { text: d.fields.title })),
    el('p', { class: 'small', text: `${money(Math.round(Number(d.fields.price) * 100))} · ${d.assets.filter((a) => a.role === 'image').length} images${d.fields.type === 'download' ? ` · ${d.assets.filter((a) => a.role === 'file').length} files` : ''}` }),
    el('p', { class: 'small', text: 'Publishing makes the listing live and buyable. Etsy charges a listing fee when a listing is published (and on each renewal). Check Etsy’s current fee schedule.' }),
    el('label', { class: 'check' }, fees, 'I understand Etsy will charge the listing fee'),
    el('label', { class: 'field' }, `Type ${phrase} to confirm`, typed),
    S.session.shop.is_demo ? el('p', { class: 'small muted', text: 'Demo: publishes to the offline demo shop only.' }) : null),
  { confirmLabel: 'Publish', danger: true, validate: () => typed.value === phrase && fees.checked })
  if (!ok) return
  const r = await run(null, () => api('POST', `/api/drafts/${d.id}/publish`, { confirm_text: typed.value, acknowledge_fees: fees.checked }))
  toast(r.status === 'published' ? 'Published and verified on Etsy' : r.last_error ?? 'Check the draft', r.status === 'published' ? '' : 'error')
  openDraft(d.id)
  updateDraftCount()
}

// ---------- PERFORMANCE ----------
async function viewPerformance() {
  const p = await api('GET', '/api/performance')
  const c = p.compare
  const tile = (lbl, val, ch, t) => el('div', { class: 'card metric' }, el('div', { class: 'label', text: lbl }, t ? tip(t) : null), el('div', { class: 'value', text: val }), ch === undefined ? el('span', { class: 'delta muted', text: ' ' }) : delta(ch))
  let top = '90'
  const topBox = el('div')
  const seg = ['90', '365'].map((v) => el('button', { type: 'button', 'aria-pressed': String(v === top), text: v === '90' ? '90 days' : '12 months', onclick: () => { top = v; seg.forEach((b, i) => b.setAttribute('aria-pressed', String(['90', '365'][i] === v))); drawTop() } }))
  const drawTop = () => clear(topBox).append(sortableTable([
    { key: 'title', label: 'Listing', render: (r) => el('div', { class: 'title trunc', text: r.title }) },
    { key: 'units', label: 'Units', num: true },
    { key: 'orders', label: 'Orders', num: true },
    { key: 'revenue_minor', label: 'Revenue', num: true, render: (r) => money(r.revenue_minor) },
  ], top === '90' ? p.top90 : p.top365, { initial: { key: 'revenue_minor', dir: 'desc' } }))
  drawTop()
  const smallList = (rows, render, empty) => (rows.length ? el('ul', { class: 'list' }, rows.map(render)) : el('p', { class: 'muted', text: empty }))
  return el('div', {}, head('Performance', `${p.window_note}. Last 30 days vs previous 30.`),
    el('div', { class: 'grid g4' },
      tile('Revenue', money(c.current.revenue_minor), c.change.revenue, 'Item sales after discounts; excludes shipping and tax.'),
      tile('Paid orders', num(c.current.orders), c.change.orders),
      tile('Units', num(c.current.units), c.change.units),
      tile('Average order', money(c.current.aov_minor), c.change.aov),
      tile('Units per order', c.current.units_per_order),
      tile('Active listings', num(p.active_listings)),
      tile('Favourites', num(p.favorites), undefined, 'Sum of favourites on active listings.'),
      tile('Review score', p.reviews.shop_average ? `${p.reviews.shop_average}★` : '—', undefined, `${num(p.reviews.shop_count)} reviews (Etsy shop rating).`)),
    el('div', { class: 'grid g2' },
      el('section', { class: 'card' }, el('h2', { text: 'Monthly revenue' }), barChart(p.monthly, { value: (m) => m.revenue_minor, label: (m) => m.month, format: (v) => money(v) }), el('p', { class: 'small muted', text: 'Conversion trend: not available — Etsy’s API has no visit data.' })),
      el('section', { class: 'card' }, el('h2', { text: 'Monthly orders' }), barChart(p.monthly, { value: (m) => m.orders, label: (m) => m.month, format: (v) => `${v} orders` }))),
    el('section', { class: 'card flush' }, el('div', { class: 'row pad' }, el('h2', { text: 'Top listings' }), el('span', { class: 'spacer' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Window' }, seg)), topBox),
    el('div', { class: 'grid g3' },
      el('section', { class: 'card' }, el('h2', { text: 'Declining' }), smallList(p.declining, (r) => el('li', {}, el('span', { class: 'grow trunc', text: r.title }), el('span', { class: 'delta down', text: `${r.change}%` }), el('button', { type: 'button', class: 'link', text: 'Review', onclick: () => openListing(r.listing_id) })), 'Nothing declining sharply.')),
      el('section', { class: 'card' }, el('h2', { text: 'New listings' }), smallList(p.new_listings.slice(0, 6), (r) => el('li', {}, el('span', { class: 'grow trunc', text: r.title }), el('span', { class: 'muted', text: `${r.units} sold` })), 'No listings created in the last 120 days.')),
      el('section', { class: 'card' }, el('h2', { text: 'Applied changes' }, ' ', tip('Same-length windows before and after each change. Correlation only — not proof the edit caused it.')), smallList(p.outcomes.slice(0, 6), (o) => el('li', {}, el('div', { class: 'grow' }, el('div', { class: 'trunc', text: o.title }), el('div', { class: 'small muted', text: `${label(o.field)} · ${date(o.applied_at)} · ${o.window_days}d: ${o.before.units} → ${o.after.units} units${o.maturing ? ' (still maturing)' : ''}` }))), 'No applied changes yet.'))))
}

window.addEventListener('hashchange', route)
route()
