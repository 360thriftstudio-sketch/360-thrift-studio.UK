import type { CollectionConfig } from 'payload'

import { isStaff } from '@/access'

/** Trade-account applications, luxury requests, contact, newsletter and visit bookings. */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: { useAsTitle: 'email', defaultColumns: ['type', 'email', 'company', 'status', 'createdAt'], group: 'Quotes & customers' },
  defaultSort: '-createdAt',
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Trade account application', value: 'trade-account' },
        { label: 'Luxury request', value: 'luxury' },
        { label: 'Contact', value: 'contact' },
        { label: 'Newsletter sign-up', value: 'newsletter' },
        { label: 'Warehouse visit', value: 'warehouse-visit' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Done', value: 'done' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'email', type: 'email', required: true },
    { name: 'name', type: 'text' },
    { name: 'company', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'country', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'fields', type: 'json', admin: { description: 'Extra form answers.' } },
    { name: 'customer', type: 'relationship', relationTo: 'customers' },
  ],
}
