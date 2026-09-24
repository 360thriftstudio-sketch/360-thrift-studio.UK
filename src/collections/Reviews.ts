import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '@/access'

/** Real, sourced reviews only. Every review needs a source link. */
export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: { useAsTitle: 'author', defaultColumns: ['author', 'rating', 'source', 'status'], group: 'Content' },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'author', type: 'text', required: true },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5 },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: [
        { label: 'Google', value: 'google' },
        { label: 'Trustpilot', value: 'trustpilot' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'sourceUrl', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'published',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
