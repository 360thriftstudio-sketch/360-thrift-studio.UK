import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { orderField, seoField, slugField } from '@/fields/slug'

/** Dedicated assortments / tiers, e.g. "TNF Puffers — A. Premium / Iconic". */
export const BrandCollections: CollectionConfig = {
  slug: 'brand-collections',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'brand', 'tier'], group: 'Catalogue taxonomy' },
  defaultSort: 'order',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'brand', type: 'relationship', relationTo: 'brands', required: true, index: true },
    { name: 'section', type: 'relationship', relationTo: 'sections' },
    { name: 'tier', type: 'text', admin: { description: 'Badge label, e.g. "A. Premium / Iconic".' } },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    orderField,
    seoField,
  ],
}
