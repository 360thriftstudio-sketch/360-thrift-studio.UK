import type { GlobalConfig } from 'payload'

import { anyone, isStaff } from '@/access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  admin: { group: 'Admin' },
  access: { read: anyone, update: isStaff },
  fields: [
    {
      type: 'collapsible',
      label: 'Brand logos (legal guardrail)',
      fields: [
        {
          name: 'showBrandLogos',
          label: 'Show brand logos (SHOW_BRAND_LOGOS)',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Keep OFF until you have written permission or UK IP-solicitor sign-off. When off, every brand shows as a text wordmark. Each brand also needs "Logo approved".',
          },
        },
      ],
    },
    {
      name: 'requireLoginForPrices',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hide all guide prices from guests (trade-only lots are always hidden).' },
    },
    {
      name: 'announcement',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'text', type: 'text', defaultValue: 'Restock live · 24h dispatch · UK & worldwide' },
        { name: 'link', type: 'text' },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'whatsapp', type: 'text', admin: { description: 'International format, e.g. 447700900000.' } },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'trust',
      type: 'array',
      label: 'Trust strip',
      maxRows: 4,
      admin: { description: 'Short, provable facts only.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
  ],
}
