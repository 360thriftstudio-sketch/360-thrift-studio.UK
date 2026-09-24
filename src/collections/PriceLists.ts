import type { CollectionConfig } from 'payload'

import { isStaff } from '@/access'

import { priceTiersField } from './priceTiersField'

/** Account-level pricing (e.g. Tier A trade). Overrides guide prices when logged in. */
export const PriceLists: CollectionConfig = {
  slug: 'price-lists',
  admin: { useAsTitle: 'name', group: 'Quotes & customers' },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'discountPercent', type: 'number', min: 0, max: 100, admin: { description: '% off every guide price.' } },
    {
      name: 'overrides',
      type: 'array',
      admin: { description: 'Exact bands for specific lots. These win over the discount.' },
      fields: [{ name: 'lot', type: 'relationship', relationTo: 'lots', required: true }, priceTiersField(false)],
    },
  ],
}
