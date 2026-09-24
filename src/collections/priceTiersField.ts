import type { Field } from 'payload'

import { MAX_TIERS, validateTiers, type PriceTier } from '@/lib/pricing'

/** Price bands shared by Lots and PriceList overrides. Validated by lib/pricing. */
export const priceTiersField = (required = true): Field => ({
  name: 'priceTiers',
  type: 'array',
  required,
  minRows: required ? 1 : 0,
  maxRows: MAX_TIERS,
  labels: { singular: 'Price band', plural: 'Price bands' },
  admin: {
    description:
      'Guide prices excl. VAT & shipping. Bands must start at 1 and follow on (e.g. 1 / 2–4 / 5–9 / 10+). Leave max empty on the last band.',
  },
  validate: (value: unknown) => {
    if (!required && (!Array.isArray(value) || value.length === 0)) return true
    const errors = validateTiers(value as PriceTier[] | null)
    return errors.length ? errors.join(' ') : true
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'minQty', type: 'number', required: true, min: 1, admin: { width: '20%' } },
        { name: 'maxQty', type: 'number', min: 1, admin: { width: '20%' } },
        { name: 'price', type: 'number', min: 0, admin: { width: '20%', description: '£ per unit' } },
        {
          name: 'unit',
          type: 'select',
          required: true,
          defaultValue: 'lot',
          options: [
            { label: 'per lot', value: 'lot' },
            { label: 'per kg', value: 'kg' },
            { label: 'per piece', value: 'piece' },
          ],
          admin: { width: '20%' },
        },
        { name: 'quoteOnly', type: 'checkbox', admin: { width: '20%' } },
      ],
    },
  ],
})
