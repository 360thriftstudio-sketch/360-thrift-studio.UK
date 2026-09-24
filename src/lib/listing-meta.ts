import type { Metadata } from 'next'

import { hasFilters, parseListingParams } from './facets'

type SP = Record<string, string | string[] | undefined>

/** Filtered/sorted/searched listing URLs are noindex with a canonical to the clean path. */
export function listingMetadata(path: string, sp: SP, meta: { title: string; description?: string | null }): Metadata {
  const state = parseListingParams(sp)
  const filtered = hasFilters(state.filters) || state.sort !== 'newest' || state.page > 1 || !!state.q
  return {
    title: meta.title,
    description: meta.description ?? undefined,
    alternates: { canonical: path },
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}
