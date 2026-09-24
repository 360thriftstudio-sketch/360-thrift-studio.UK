import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { seoField, slugField } from '@/fields/slug'

/** The 15 top-level garment sections (1 T-Shirts … 15 Bags (Women)). */
export const Sections: CollectionConfig = {
  slug: 'sections',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['number', 'name', 'slug', 'menuColumn'],
    group: 'Catalogue taxonomy',
  },
  defaultSort: 'number',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'number', type: 'number', required: true, unique: true, min: 1 },
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'intro', type: 'textarea', admin: { description: '1–2 lines shown under the H1.' } },
    { name: 'image', type: 'upload', relationTo: 'media', admin: { description: '3:4 tile image.' } },
    {
      name: 'menuColumn',
      type: 'select',
      defaultValue: '1',
      options: [
        { label: 'Column 1 (tops, shirts, bottoms, denim, sweats)', value: '1' },
        { label: 'Column 2 (knitwear, outerwear, activewear, bags)', value: '2' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'subcategoryGroups',
      type: 'array',
      admin: { description: 'Group headings, e.g. "A — Lightweight / Technical / Shell".' },
      fields: [
        { name: 'key', type: 'text', required: true, admin: { description: 'A, B, C…' } },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'brandSets',
      type: 'array',
      labels: { singular: 'Brand set', plural: 'Fashion categories & relevant brands' },
      admin: { description: 'Brands stocked in this section, grouped by fashion category.' },
      fields: [
        { name: 'fashionCategory', type: 'relationship', relationTo: 'fashion-categories', required: true },
        { name: 'label', type: 'text', admin: { description: 'Heading as written in the catalogue.' } },
        { name: 'brands', type: 'relationship', relationTo: 'brands', hasMany: true },
      ],
    },
    {
      name: 'seoContent',
      type: 'richText',
      admin: { description: 'Expandable text at the bottom of the listing.' },
    },
    seoField,
  ],
}
