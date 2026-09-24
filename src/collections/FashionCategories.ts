import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { orderField, seoField, slugField } from '@/fields/slug'

/** Styles: Classic & Preppy, Outdoor/Gorpcore, Y2K & Vintage… (/styles/[slug]) */
export const FashionCategories: CollectionConfig = {
  slug: 'fashion-categories',
  labels: { singular: 'Fashion category', plural: 'Fashion categories' },
  admin: { useAsTitle: 'name', group: 'Catalogue taxonomy' },
  defaultSort: 'order',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    orderField,
    seoField,
  ],
}
