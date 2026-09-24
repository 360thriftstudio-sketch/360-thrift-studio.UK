import type { CollectionConfig } from 'payload'

import { isStaff, isStaffField } from '@/access'

/** Trade buyers. Can log in to the site (not the admin). */
export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    useAsTitle: 'company',
    defaultColumns: ['company', 'email', 'country', 'tradeStatus'],
    group: 'Quotes & customers',
  },
  auth: { tokenExpiration: 60 * 60 * 24 * 30 },
  access: {
    admin: () => false,
    create: () => true,
    read: ({ req }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'customers') return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'customers') return { id: { equals: req.user.id } }
      return false
    },
    delete: isStaff,
  },
  fields: [
    { name: 'company', type: 'text', required: true },
    { name: 'contactName', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'vatNumber', type: 'text', label: 'VAT number' },
    { name: 'companyNumber', type: 'text' },
    { name: 'country', type: 'text', required: true, defaultValue: 'United Kingdom' },
    {
      name: 'buyerType',
      type: 'relationship',
      relationTo: 'buyer-types',
    },
    {
      name: 'tradeStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'No application', value: 'none' },
        { label: 'Pending check', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: { update: isStaffField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'priceList',
      type: 'relationship',
      relationTo: 'price-lists',
      access: { update: isStaffField },
      admin: { position: 'sidebar', description: 'Overrides guide prices when logged in.' },
    },
    {
      name: 'addresses',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'line1', type: 'text', required: true },
        { name: 'line2', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'postcode', type: 'text', required: true },
        { name: 'country', type: 'text', required: true },
      ],
    },
    {
      name: 'savedLots',
      type: 'relationship',
      relationTo: 'lots',
      hasMany: true,
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: { read: isStaffField, update: isStaffField },
    },
  ],
}
