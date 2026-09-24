import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { seoField, slugField } from '@/fields/slug'
import { brandPageDisclaimer } from '@/lib/brand-logos'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'featured', 'logoApproved', 'luxuryOnRequest'],
    group: 'Catalogue taxonomy',
  },
  defaultSort: 'name',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'brand',
      options: [
        { label: 'Brand', value: 'brand' },
        { label: 'Stock group (e.g. Unbranded Y2K)', value: 'stock-group' },
        { label: 'League / licence (verified official only)', value: 'licence' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'sections', type: 'relationship', relationTo: 'sections', hasMany: true },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Short, neutral description. No brand marketing copy.' },
    },
    {
      name: 'disclaimer',
      type: 'text',
      admin: { description: 'Leave blank for the standard "Independent reseller — not affiliated with [Brand]" note.' },
      hooks: {
        afterRead: [({ value, data }) => value || brandPageDisclaimer(String(data?.name ?? 'this brand'))],
      },
    },
    { name: 'fashionCategories', type: 'relationship', relationTo: 'fashion-categories', hasMany: true },
    {
      type: 'collapsible',
      label: 'Logo (legal guardrail)',
      admin: {
        description:
          'A logo only shows when Settings → "Show brand logos" is on AND "Logo approved" is ticked here. Only tick it with written permission or solicitor sign-off. Never upload altered or animated versions of a brand mark.',
      },
      fields: [
        {
          name: 'logoSvg',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Monochrome SVG, named brand-[slug].svg.' },
        },
        { name: 'logoApproved', type: 'checkbox', defaultValue: false },
        {
          name: 'wordmarkOnly',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Always show a text wordmark, even if approved.' },
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Show in the Brands mega menu (top 16).' },
    },
    {
      name: 'luxuryOnRequest',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Sourced on request (e.g. Dior, Gucci, Louis Vuitton).' },
    },
    seoField,
  ],
}
