import 'server-only'

import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type {
  Brand,
  BrandCollection,
  BuyerType,
  Descriptor,
  FashionCategory,
  Lot,
  Media,
  Section,
  Subcategory,
} from '@/payload-types'

import type { LotSummary, Ref } from './facets'
import type { PriceTier } from './pricing'
import { slugify } from './utils'

export const getPayloadClient = cache(() => getPayload({ config: configPromise }))

const obj = <T extends object>(v: unknown): T | null => (v && typeof v === 'object' ? (v as T) : null)

const ref = (d: { id: number | string; slug: string; name: string }): Ref => ({
  id: String(d.id),
  slug: d.slug,
  name: d.name,
})

const descriptorRef = (d: Descriptor) => ({
  id: String(d.id),
  slug: `${slugify(d.group)}--${slugify(d.term)}`,
  name: d.term,
  group: d.group,
})

export function toSummary(lot: Lot): LotSummary | null {
  const section = obj<Section>(lot.section)
  if (!section) return null
  const collection = obj<BrandCollection>(lot.brandCollection)
  return {
    id: String(lot.id),
    slug: lot.slug,
    sku: lot.sku,
    title: lot.title,
    section: { ...ref(section), number: section.number },
    subcategories: (lot.subcategory ?? [])
      .map((s) => obj<Subcategory>(s))
      .filter((s): s is Subcategory => !!s)
      .map((s) => ({ ...ref(s), group: s.group })),
    brands: (lot.brands ?? [])
      .map((b) => ({ brand: obj<Brand>(b.brand), count: b.count }))
      .filter((b): b is { brand: Brand; count: number | null | undefined } => !!b.brand)
      .map((b) => ({ ...ref(b.brand), count: b.count })),
    styles: (lot.fashionCategories ?? []).map((s) => obj<FashionCategory>(s)).filter((s): s is FashionCategory => !!s).map(ref),
    collection: collection ? { ...ref(collection), tier: collection.tier } : null,
    grade: lot.grade,
    lotType: lot.lotType,
    pieces: lot.pieces,
    weightKg: lot.weightKg,
    era: lot.era,
    division: lot.division ?? [],
    descriptors: (lot.descriptors ?? []).map((d) => obj<Descriptor>(d)).filter((d): d is Descriptor => !!d).map(descriptorRef),
    designGroups: (lot.designGroups ?? []).map((d) => obj<Descriptor>(d)).filter((d): d is Descriptor => !!d).map(descriptorRef),
    bestFor: (lot.bestSuitedFor ?? []).map((b) => obj<BuyerType>(b)).filter((b): b is BuyerType => !!b).map(ref),
    priceTiers: (lot.priceTiers ?? []).map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty,
      price: t.price,
      unit: t.unit,
      quoteOnly: t.quoteOnly,
    })) as PriceTier[],
    priceVisibility: lot.priceVisibility,
    stock: {
      lotsAvailable: lot.stock.lotsAvailable,
      status: lot.stock.status,
      dispatch: lot.stock.dispatch,
      moq: lot.stock.moq,
    },
    badges: lot.badges ?? [],
    publishedAt: lot.publishedAt ?? lot.createdAt,
    images: (lot.media ?? [])
      .filter((m) => m.kind !== 'video')
      .map((m) => ({ media: obj<Media>(m.image), alt: m.alt }))
      .filter((m) => m.media?.url)
      .map((m) => ({ url: m.media!.sizes?.card?.url || m.media!.url!, alt: m.alt })),
  }
}

/** All published lots matching a base scope (section, brand, style…). */
export async function getLots(where: Where = {}): Promise<LotSummary[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'lots',
    where: { and: [{ status: { equals: 'published' } }, where] },
    depth: 1,
    limit: 2000,
    pagination: false,
  })
  return res.docs.map(toSummary).filter((l): l is LotSummary => !!l)
}

export const getSections = cache(async () => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'sections', sort: 'number', limit: 50, depth: 2 })
  return res.docs
})

export async function getSectionBySlug(slug: string) {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'sections', where: { slug: { equals: slug } }, limit: 1, depth: 2 })
  return res.docs[0] ?? null
}

export async function getSubcategories(sectionId: number | string) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'subcategories',
    where: { section: { equals: sectionId } },
    sort: 'order',
    limit: 200,
    depth: 0,
  })
  return res.docs
}

export async function findOne<C extends 'brands' | 'fashion-categories' | 'brand-collections' | 'lots' | 'pages'>(
  collection: C,
  slug: string,
  depth = 1,
) {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth })
  return res.docs[0] ?? null
}

/** Count published lots per section (for tiles and menus). */
export const getLotCounts = cache(async () => {
  const lots = await getLots()
  const bySection = new Map<string, number>()
  const byBrand = new Map<string, number>()
  const byStyle = new Map<string, number>()
  const byCollection = new Map<string, number>()
  for (const l of lots) {
    if (l.stock.status === 'sold') continue
    bySection.set(l.section.slug, (bySection.get(l.section.slug) ?? 0) + 1)
    for (const b of l.brands) byBrand.set(b.slug, (byBrand.get(b.slug) ?? 0) + 1)
    for (const s of l.styles) byStyle.set(s.slug, (byStyle.get(s.slug) ?? 0) + 1)
    if (l.collection) byCollection.set(l.collection.slug, (byCollection.get(l.collection.slug) ?? 0) + 1)
  }
  return { bySection, byBrand, byStyle, byCollection, all: lots }
})
