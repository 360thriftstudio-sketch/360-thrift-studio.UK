import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { orderField, seoField } from '@/fields/slug'
import { slugify } from '@/lib/utils'

export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'section', 'group', 'slug'],
    group: 'Catalogue taxonomy',
  },
  defaultSort: 'order',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Unique within its section, e.g. /shop/jackets/windbreakers.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) =>
            typeof value === 'string' && value
              ? slugify(value)
              : typeof data?.name === 'string'
                ? slugify(data.name)
                : value,
        ],
      },
    },
    { name: 'section', type: 'relationship', relationTo: 'sections', required: true, index: true },
    {
      name: 'group',
      type: 'text',
      admin: { description: 'Group key from the section (A, B, C…).' },
    },
    { name: 'intro', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    orderField,
    seoField,
  ],
  indexes: [{ fields: ['section', 'slug'], unique: true }],
}
