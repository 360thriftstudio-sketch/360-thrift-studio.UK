import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '@/access'
import { seoField, slugField } from '@/fields/slug'

/**
 * Info and legal pages (/about, /grading, /legal/privacy…).
 * Page blocks (Hero, SectionTiles, FAQ…) are added in Build 5.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status'], group: 'Content' },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'intro', type: 'textarea' },
    { name: 'content', type: 'richText' },
    seoField,
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
