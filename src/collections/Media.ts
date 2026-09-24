import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '@/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content' },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Describe what the photo shows (used as alt text).' },
    },
    { name: 'credit', type: 'text' },
  ],
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm', 'application/pdf', 'image/svg+xml'],
    imageSizes: [
      { name: 'thumb', width: 320, height: 400, position: 'centre' },
      { name: 'card', width: 640, height: 800, position: 'centre' },
      { name: 'large', width: 1600 },
    ],
    adminThumbnail: 'thumb',
    formatOptions: { format: 'webp', options: { quality: 80 } },
  },
}
