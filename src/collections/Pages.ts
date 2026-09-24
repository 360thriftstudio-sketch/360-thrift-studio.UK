import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '@/access'
import { seoField, slugField } from '@/fields/slug'

/**
 * Info and legal pages (/about, /grading, /legal/privacy…).
 * Simple heading + body sections; full page blocks come in Build 5.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status'], group: 'Content' },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    {
      name: 'group',
      type: 'select',
      required: true,
      defaultValue: 'info',
      options: [
        { label: 'Info page (/slug)', value: 'info' },
        { label: 'Legal page (/legal/slug)', value: 'legal' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'intro', type: 'textarea' },
    {
      name: 'sections',
      type: 'array',
      labels: { singular: 'Content section', plural: 'Content sections' },
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'body', type: 'textarea', admin: { description: 'Blank line = new paragraph. Lines starting "- " become a list.' } },
      ],
    },
    { name: 'content', type: 'richText', admin: { description: 'Optional rich text after the sections.' } },
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
