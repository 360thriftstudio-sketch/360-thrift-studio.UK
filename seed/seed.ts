/**
 * Seeds the CMS from seed/taxonomy.json (generated from the 360 Thrift Studio
 * catalogue) and seed/pages.json. Idempotent: upserts by slug.
 *
 *   pnpm seed          taxonomy + info pages + settings
 *   pnpm seed --demo   also publishes DEMO- lots so listings have content (dev only)
 */
import 'dotenv/config'

import { getPayload, type CollectionSlug, type Payload } from 'payload'

import { defaultTiers } from '../src/lib/pricing'
import { slugify } from '../src/lib/utils'
import config from '../src/payload.config'
import { buildDemoLots } from './demo-lots'
import pages from './pages.json' with { type: 'json' }
import taxonomy from './taxonomy.json' with { type: 'json' }

type Id = number
type Data = Record<string, unknown>

async function upsert(payload: Payload, collection: CollectionSlug, where: Data, data: Data): Promise<Id> {
  const found = await payload.find({
    collection,
    where: Object.fromEntries(Object.entries(where).map(([k, v]) => [k, { equals: v }])),
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing = found.docs[0]
  if (existing) {
    const doc = await payload.update({ collection, id: existing.id, data, depth: 0, overrideAccess: true })
    return doc.id as Id
  }
  const doc = await payload.create({ collection, data: { ...where, ...data }, depth: 0, overrideAccess: true })
  return doc.id as Id
}

const defined = <T>(xs: (T | undefined)[]): T[] => xs.filter((x): x is T => x !== undefined)

async function seed() {
  const demo = process.argv.includes('--demo')
  const payload = await getPayload({ config })
  const log = (msg: string) => payload.logger.info(`[seed] ${msg}`)

  // Staff admin (first run only)
  const { totalDocs: staff } = await payload.count({ collection: 'users', overrideAccess: true })
  if (staff === 0 && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    await payload.create({
      collection: 'users',
      data: {
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
        role: 'admin',
        name: 'Admin',
      },
      overrideAccess: true,
    })
    log(`created admin ${process.env.SEED_ADMIN_EMAIL}`)
  }

  // Fashion categories
  const styleIds = new Map<string, Id>()
  for (const [i, s] of taxonomy.fashionCategories.entries()) {
    styleIds.set(
      s.name,
      await upsert(payload, 'fashion-categories', { slug: slugify(s.name) }, { name: s.name, description: s.description, order: i }),
    )
  }
  log(`${styleIds.size} fashion categories`)

  // Buyer types
  const buyerIds = new Map<string, Id>()
  for (const name of taxonomy.buyerTypes) {
    buyerIds.set(name, await upsert(payload, 'buyer-types', { slug: slugify(name) }, { name }))
  }
  log(`${buyerIds.size} buyer types`)

  // Sections + subcategories (brand sets are linked after brands exist)
  const sectionIds = new Map<number, Id>()
  const subIds = new Map<string, Id>() // `${sectionNumber}:${name}`
  for (const s of taxonomy.sections) {
    const sectionId = await upsert(
      payload,
      'sections',
      { slug: slugify(s.name) },
      {
        number: s.number,
        name: s.name,
        intro: s.intro,
        menuColumn: s.menuColumn,
        subcategoryGroups: s.groups.filter((g) => g.key).map((g) => ({ key: g.key, label: g.label })),
      },
    )
    sectionIds.set(s.number, sectionId)
    let order = 0
    for (const g of s.groups) {
      for (const name of g.subcategories) {
        subIds.set(
          `${s.number}:${name}`,
          await upsert(
            payload,
            'subcategories',
            { section: sectionId, slug: slugify(name) },
            { name, group: g.key || null, order: order++ },
          ),
        )
      }
    }
  }
  log(`${sectionIds.size} sections, ${subIds.size} subcategories`)

  // Brands
  const brandIds = new Map<string, Id>()
  for (const b of taxonomy.brands) {
    brandIds.set(
      b.name,
      await upsert(
        payload,
        'brands',
        { slug: slugify(b.name) },
        {
          name: b.name,
          kind: b.kind,
          featured: b.featured,
          luxuryOnRequest: b.luxuryOnRequest,
          fashionCategories: defined(b.styles.map((s) => styleIds.get(s))),
          sections: defined(b.sections.map((n) => sectionIds.get(n))),
        },
      ),
    )
  }
  log(`${brandIds.size} brands / stock groups`)

  // Section brand sets
  for (const s of taxonomy.sections) {
    await payload.update({
      collection: 'sections',
      id: sectionIds.get(s.number)!,
      data: {
        brandSets: s.brandSets.map((set) => ({
          fashionCategory: styleIds.get(set.style),
          label: set.label,
          brands: defined(set.brands.map((b) => brandIds.get(b))),
        })),
      },
      depth: 0,
      overrideAccess: true,
    })
  }

  // Brand collections
  const collectionIds = new Map<string, Id>()
  for (const [i, c] of taxonomy.brandCollections.entries()) {
    collectionIds.set(
      c.name,
      await upsert(
        payload,
        'brand-collections',
        { slug: slugify(c.name) },
        {
          name: c.name,
          tier: c.tier,
          description: c.description,
          order: i,
          brand: brandIds.get(c.brand),
          section: sectionIds.get(c.section),
          bestSuitedFor: defined(c.bestSuitedFor.map((b) => buyerIds.get(b))),
        },
      ),
    )
  }
  log(`${collectionIds.size} brand collections`)

  // Descriptors — one term per group, linked to every section that uses it
  const terms = new Map<string, { term: string; group: string; kind: string; sections: Id[] }>()
  for (const s of taxonomy.sections) {
    for (const d of s.descriptors) {
      for (const term of d.terms) {
        const key = slugify(`${d.group}-${term}`)
        const entry = terms.get(key) ?? { term, group: d.group, kind: d.kind, sections: [] }
        entry.sections.push(sectionIds.get(s.number)!)
        terms.set(key, entry)
      }
    }
  }
  const descriptorIds = new Map<string, Id>()
  for (const [slug, t] of terms) {
    descriptorIds.set(slug, await upsert(payload, 'descriptors', { slug }, t))
  }
  log(`${descriptorIds.size} descriptor terms`)

  // Settings
  await payload.updateGlobal({
    slug: 'settings',
    data: {
      business: {
        name: taxonomy.business.name,
        tagline: taxonomy.business.tagline,
        slogan: 'Good clothes. Bigger stories.',
        locations: taxonomy.business.locations.map((country) => ({ country, detail: 'Office & warehouse' })),
      },
      announcement: { enabled: true, text: 'Restock live · 24h dispatch · UK & worldwide' },
      trust: [
        { value: '15', label: 'Garment sections' },
        { value: '120+', label: 'Brands & stock groups' },
        { value: '24h', label: 'Dispatch after payment' },
        { value: 'UK · PK', label: 'Offices & warehouses' },
      ],
    },
    overrideAccess: true,
  })

  // Info & legal pages
  for (const p of pages) {
    await upsert(
      payload,
      'pages',
      { slug: p.slug },
      { title: p.title, group: p.group, intro: p.intro, sections: p.sections, status: 'published' },
    )
  }
  log(`${pages.length} pages`)

  if (demo) {
    const termIds = (pairs: [string, string][], kind: string) =>
      defined(
        pairs
          .map(([g, t]) => slugify(`${g}-${t}`))
          .filter((slug) => terms.get(slug)?.kind === kind)
          .map((slug) => descriptorIds.get(slug)),
      )
    const lots = buildDemoLots()
    for (const lot of lots) {
      const sectionId = sectionIds.get(lot.section)!
      await upsert(
        payload,
        'lots',
        { sku: lot.sku },
        {
          title: lot.title,
          slug: slugify(lot.title),
          status: 'published',
          lotType: lot.lotType,
          pieces: lot.pieces,
          weightKg: lot.weightKg,
          grade: lot.grade,
          era: lot.era,
          division: lot.division,
          section: sectionId,
          subcategory: defined(lot.subcategories.map((n) => subIds.get(`${lot.section}:${n}`))),
          fashionCategories: defined(lot.styles.map((s) => styleIds.get(s))),
          brands: lot.brands.map(([b, count]) => ({ brand: brandIds.get(b), count })),
          brandCollection: lot.collection ? collectionIds.get(lot.collection) : undefined,
          descriptors: termIds(lot.descriptors, 'descriptor'),
          designGroups: termIds(lot.descriptors, 'design-group'),
          bestSuitedFor: defined(lot.bestFor.map((b) => buyerIds.get(b))),
          priceVisibility: lot.priceVisibility,
          priceTiers: lot.price ? defaultTiers(lot.price, lot.unit) : [{ minQty: 1, unit: 'lot', quoteOnly: true }],
          stock: { lotsAvailable: lot.lotsAvailable, status: lot.stock, dispatch: '24h dispatch', moq: 1 },
          badges: lot.badges,
          publishedAt: new Date(Date.now() - lot.ageDays * 86_400_000).toISOString(),
        },
      )
    }
    log(`${lots.length} DEMO lots published (delete before launch: SKU starts with DEMO-)`)
  }

  log('done')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
