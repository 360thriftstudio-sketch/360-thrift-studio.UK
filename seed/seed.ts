/**
 * Seeds the catalogue taxonomy from seed/taxonomy.json.
 * Idempotent: upserts by slug, so it is safe to re-run after editing the JSON.
 *
 *   pnpm seed
 */
import 'dotenv/config'

import { getPayload, type CollectionSlug, type Payload } from 'payload'

import config from '../src/payload.config'
import { slugify } from '../src/lib/utils'
import taxonomy from './taxonomy.json' with { type: 'json' }

type Data = Record<string, unknown>

async function upsert(
  payload: Payload,
  collection: CollectionSlug,
  where: Data,
  data: Data,
): Promise<string | number> {
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
    return doc.id
  }
  const doc = await payload.create({ collection, data: { ...where, ...data }, depth: 0, overrideAccess: true })
  return doc.id
}

async function seed() {
  const payload = await getPayload({ config })
  const log = (msg: string) => payload.logger.info(`[seed] ${msg}`)

  // Staff admin (first run only)
  const { totalDocs: staff } = await payload.count({ collection: 'users', overrideAccess: true })
  if (staff === 0) {
    const email = process.env.SEED_ADMIN_EMAIL
    const password = process.env.SEED_ADMIN_PASSWORD
    if (email && password) {
      await payload.create({
        collection: 'users',
        data: { email, password, role: 'admin', name: 'Admin' },
        overrideAccess: true,
      })
      log(`created admin ${email}`)
    }
  }

  // Fashion categories
  const styleIds = new Map<string, string | number>()
  for (const [i, name] of taxonomy.fashionCategories.entries()) {
    styleIds.set(name, await upsert(payload, 'fashion-categories', { slug: slugify(name) }, { name, order: i }))
  }
  log(`${styleIds.size} fashion categories`)

  // Buyer types
  for (const name of taxonomy.buyerTypes) {
    await upsert(payload, 'buyer-types', { slug: slugify(name) }, { name })
  }
  log(`${taxonomy.buyerTypes.length} buyer types`)

  // Sections + subcategories
  const sectionIds = new Map<number, string | number>()
  let subCount = 0
  for (const s of taxonomy.sections) {
    const sectionId = await upsert(
      payload,
      'sections',
      { slug: slugify(s.name) },
      {
        number: s.number,
        name: s.name,
        menuColumn: s.menuColumn,
        subcategoryGroups: s.groups.map((g) => ({ key: g.key, label: g.label })),
      },
    )
    sectionIds.set(s.number, sectionId)
    let order = 0
    for (const g of s.groups) {
      for (const name of g.subcategories) {
        await upsert(
          payload,
          'subcategories',
          { section: sectionId, slug: slugify(name) },
          { name, group: g.key, order: order++ },
        )
        subCount++
      }
    }
  }
  log(`${sectionIds.size} sections, ${subCount} subcategories`)

  // Brands
  const brandIds = new Map<string, string | number>()
  for (const b of taxonomy.brands) {
    brandIds.set(
      b.name,
      await upsert(
        payload,
        'brands',
        { slug: slugify(b.name) },
        {
          name: b.name,
          featured: Boolean(b.featured),
          luxuryOnRequest: Boolean(b.luxuryOnRequest),
          fashionCategories: b.styles.map((s) => styleIds.get(s)).filter(Boolean),
        },
      ),
    )
  }
  log(`${brandIds.size} brands`)

  // Brand collections
  for (const [i, c] of taxonomy.brandCollections.entries()) {
    await upsert(
      payload,
      'brand-collections',
      { slug: slugify(c.name) },
      {
        name: c.name,
        tier: c.tier,
        order: i,
        brand: brandIds.get(c.brand),
        section: sectionIds.get(c.section),
      },
    )
  }
  log(`${taxonomy.brandCollections.length} brand collections`)

  // Descriptors & design groups
  let termCount = 0
  for (const d of taxonomy.descriptors) {
    for (const term of d.terms) {
      await upsert(
        payload,
        'descriptors',
        { slug: slugify(`${d.group}-${term}`) },
        {
          term,
          group: d.group,
          kind: d.kind,
          sections: d.sections.map((n) => sectionIds.get(n)).filter(Boolean),
        },
      )
      termCount++
    }
  }
  log(`${termCount} descriptors`)

  log('done')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
