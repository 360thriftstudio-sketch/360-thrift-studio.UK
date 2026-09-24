import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'
import { slugField } from '@/fields/slug'

/** Facet terms: fill power, cable-knit, hooded… plus design groups (Spellout, Colour-block…). */
export const Descriptors: CollectionConfig = {
  slug: 'descriptors',
  admin: { useAsTitle: 'term', defaultColumns: ['term', 'group', 'kind'], group: 'Catalogue taxonomy' },
  defaultSort: 'group',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'term', type: 'text', required: true },
    slugField('term'),
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'descriptor',
      options: [
        { label: 'Descriptor', value: 'descriptor' },
        { label: 'Design group', value: 'design-group' },
      ],
    },
    { name: 'group', type: 'text', required: true, admin: { description: 'Facet heading, e.g. "Fill power".' } },
    {
      name: 'sections',
      type: 'relationship',
      relationTo: 'sections',
      hasMany: true,
      admin: { description: 'Only show this facet on these sections. Leave empty for all.' },
    },
  ],
}
