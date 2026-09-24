import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '@/access'
import { seoField, slugField } from '@/fields/slug'

import { priceTiersField } from './priceTiersField'

/** The sellable unit: a single-brand lot, mixed lot, or bale by kg. */
export const Lots: CollectionConfig = {
  slug: 'lots',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'section', 'grade', 'status'],
    listSearchableFields: ['title', 'sku'],
    group: 'Catalogue',
  },
  defaultSort: '-publishedAt',
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Lot',
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'sku', type: 'text', required: true, unique: true, index: true },
                {
                  name: 'lotType',
                  type: 'select',
                  required: true,
                  defaultValue: 'mixed-brand',
                  options: [
                    { label: 'Single-brand lot', value: 'single-brand' },
                    { label: 'Mixed-brand lot', value: 'mixed-brand' },
                    { label: 'Bale by kg', value: 'bale-kg' },
                    { label: 'Shape-specific', value: 'shape-specific' },
                    { label: 'On request', value: 'on-request' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'pieces', type: 'number', min: 1 },
                { name: 'weightKg', type: 'number', min: 0, label: 'Weight (kg)' },
                {
                  name: 'grade',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Cream', value: 'cream' },
                    { label: 'A', value: 'a' },
                    { label: 'B', value: 'b' },
                    { label: 'Mixed', value: 'mixed' },
                  ],
                },
                {
                  name: 'era',
                  type: 'select',
                  options: [
                    { label: 'Verified vintage', value: 'verified-vintage' },
                    { label: '1980s', value: '1980s' },
                    { label: '1990s', value: '1990s' },
                    { label: 'Verified Y2K', value: 'verified-y2k' },
                    { label: 'Y2K style', value: 'y2k-style' },
                    { label: 'Modern', value: 'modern' },
                  ],
                },
              ],
            },
            {
              name: 'division',
              type: 'select',
              hasMany: true,
              options: [
                { label: "Women's", value: 'womens' },
                { label: "Men's", value: 'mens' },
                { label: 'Unisex', value: 'unisex' },
              ],
            },
            { name: 'description', type: 'richText' },
            {
              name: 'media',
              type: 'array',
              labels: { singular: 'Photo or video', plural: 'Photos & videos' },
              admin: { description: 'Your own stock photos only, 4:5, ≥ 1600 px. Name files SKU_01.jpg.' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'alt', type: 'text', required: true },
                {
                  name: 'kind',
                  type: 'select',
                  defaultValue: 'image',
                  options: [
                    { label: 'Image', value: 'image' },
                    { label: 'Video', value: 'video' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Taxonomy',
          fields: [
            { name: 'section', type: 'relationship', relationTo: 'sections', required: true, index: true },
            {
              name: 'subcategory',
              type: 'relationship',
              relationTo: 'subcategories',
              hasMany: true,
              filterOptions: ({ data }) =>
                data?.section ? { section: { equals: data.section } } : true,
            },
            { name: 'fashionCategories', type: 'relationship', relationTo: 'fashion-categories', hasMany: true },
            {
              name: 'brands',
              type: 'array',
              admin: { description: 'Mix breakdown. Counts feed the MixBreakdownChart.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'brand', type: 'relationship', relationTo: 'brands', required: true },
                    { name: 'count', type: 'number', min: 0 },
                  ],
                },
              ],
            },
            {
              name: 'brandCollection',
              type: 'relationship',
              relationTo: 'brand-collections',
            },
            {
              name: 'descriptors',
              type: 'relationship',
              relationTo: 'descriptors',
              hasMany: true,
              filterOptions: { kind: { equals: 'descriptor' } },
            },
            {
              name: 'designGroups',
              type: 'relationship',
              relationTo: 'descriptors',
              hasMany: true,
              filterOptions: { kind: { equals: 'design-group' } },
            },
            { name: 'bestSuitedFor', type: 'relationship', relationTo: 'buyer-types', hasMany: true },
          ],
        },
        {
          label: 'Pricing & stock',
          fields: [
            {
              name: 'priceVisibility',
              type: 'select',
              required: true,
              defaultValue: 'public',
              options: [
                { label: 'Public', value: 'public' },
                { label: 'Trade accounts only', value: 'trade-only' },
                { label: 'On request', value: 'on-request' },
              ],
            },
            priceTiersField(),
            {
              name: 'stock',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'lotsAvailable', type: 'number', required: true, min: 0, defaultValue: 1 },
                    {
                      name: 'reserved',
                      type: 'number',
                      min: 0,
                      defaultValue: 0,
                      admin: { readOnly: true, description: 'Soft-reserved by open RFQs (48 h).' },
                    },
                    {
                      name: 'status',
                      type: 'select',
                      required: true,
                      defaultValue: 'in-stock',
                      options: [
                        { label: 'In stock', value: 'in-stock' },
                        { label: 'Low stock', value: 'low' },
                        { label: 'Arriving', value: 'arriving' },
                        { label: 'Reserved', value: 'reserved' },
                        { label: 'Sold', value: 'sold' },
                      ],
                    },
                  ],
                },
                { name: 'dispatch', type: 'text', defaultValue: '24h dispatch' },
                { name: 'moq', type: 'number', min: 1, label: 'Minimum order (lots)', defaultValue: 1 },
              ],
            },
          ],
        },
        { label: 'SEO', fields: [seoField] },
      ],
    },
    slugField('title'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'badges',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Best seller', value: 'best-seller' },
        { label: 'Verified era', value: 'verified-era' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
  ],
}
