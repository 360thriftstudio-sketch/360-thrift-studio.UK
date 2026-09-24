import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { slugField } from '@/fields/slug'

/** "Best suited for" audiences, e.g. Streetwear resellers, Y2K boutiques. */
export const BuyerTypes: CollectionConfig = {
  slug: 'buyer-types',
  admin: { useAsTitle: 'name', group: 'Catalogue taxonomy' },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [{ name: 'name', type: 'text', required: true }, slugField('name')],
}
