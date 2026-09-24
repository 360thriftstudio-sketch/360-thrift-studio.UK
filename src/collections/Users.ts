import type { CollectionConfig } from 'payload'

import { isAdmin, isStaff, isStaffUser } from '@/access'

/** Staff accounts for /admin. Buyers live in `customers`. */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', group: 'Admin' },
  auth: true,
  access: {
    read: isStaff,
    create: isAdmin,
    update: isStaff,
    delete: isAdmin,
    admin: ({ req }) => isStaffUser(req),
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      saveToJWT: true,
    },
  ],
}
