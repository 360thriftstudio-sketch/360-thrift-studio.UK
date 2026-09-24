import type { Field } from 'payload'

import { slugify } from '@/lib/utils'

/** kebab-case slug, generated from `from` when left blank. Unique + indexed. */
export const slugField = (from = 'name'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: `Used in the URL. Leave blank to generate from the ${from}.`,
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.length > 0) return slugify(value)
        const source = data?.[from]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})

export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'textarea', maxLength: 160 },
    { name: 'ogImage', type: 'upload', relationTo: 'media' },
  ],
}

export const orderField: Field = {
  name: 'order',
  type: 'number',
  defaultValue: 0,
  admin: { position: 'sidebar', description: 'Lower numbers show first.' },
}
