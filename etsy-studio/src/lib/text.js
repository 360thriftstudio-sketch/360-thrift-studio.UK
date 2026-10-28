// Tokenised, word-boundary phrase matching. No substring matching: "art" must not match "party".

export const STOP_WORDS = new Set(
  ('a an and are as at be by for from in into is it its of on or the this to with your you our my ' +
    'her his their them she he we us item items listing new free').split(' '),
)

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function stem(t) {
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y'
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1)
  return t
}

/** Words (keeps stop words), lowercased, diacritics removed. */
export function words(s) {
  return normalize(s).split(/[^a-z0-9]+/).filter(Boolean)
}

/** Content tokens: stop words removed, light plural stemming. */
export function tokens(s, { keepStop = false } = {}) {
  return words(s)
    .filter((w) => keepStop || !STOP_WORDS.has(w))
    .map(stem)
}

/**
 * Build a matcher for a phrase. A document matches when every content token of the phrase
 * (or one of its synonyms) appears as a whole token in the document, and no exclusion token appears.
 */
export function phraseMatcher(phrase, { synonyms = {}, exclusions = [] } = {}) {
  const required = tokens(phrase)
  const alts = required.map((t) => new Set([t, ...(synonyms[t] ?? []).map(stem)]))
  const excl = new Set(exclusions.flatMap((e) => tokens(e)))
  return (doc) => {
    if (!required.length) return false
    const set = doc instanceof Set ? doc : new Set(tokens(doc))
    for (const e of excl) if (set.has(e)) return false
    return alts.every((options) => [...options].some((o) => set.has(o)))
  }
}

export const tokenSet = (s) => new Set(tokens(s))

export function titleCase(s) {
  return String(s ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 && /^(and|or|for|of|the|a|an|to|in|on|with)$/i.test(w) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase())
}

export function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n))
}
