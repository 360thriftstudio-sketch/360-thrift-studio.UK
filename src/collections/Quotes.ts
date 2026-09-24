import { APIError, type CollectionConfig } from 'payload'

import { isStaff, isStaffField, ownCustomerOrStaff } from '@/access'
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  canTransition,
  nextQuoteRef,
  quoteExpiry,
  reservationExpiry,
  type QuoteStatus,
} from '@/lib/rfq'

/**
 * Request for Quote records. Created by the RFQ flow (Build 3), managed in the
 * admin Quotes inbox. Status changes follow lib/rfq.ts.
 */
export const Quotes: CollectionConfig = {
  slug: 'quotes',
  admin: {
    useAsTitle: 'ref',
    defaultColumns: ['ref', 'company', 'status', 'createdAt'],
    listSearchableFields: ['ref', 'company', 'email'],
    group: 'Quotes & customers',
  },
  defaultSort: '-createdAt',
  access: {
    read: ownCustomerOrStaff('customer'),
    create: isStaff, // buyers submit through /api/rfq, which re-prices every line
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const now = new Date()
        if (operation === 'create') {
          const year = now.getFullYear()
          const latest = await req.payload.find({
            collection: 'quotes',
            where: { ref: { like: `QR-${year}-` } },
            sort: '-ref',
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          data.ref = nextQuoteRef(latest.docs[0]?.ref, year)
          data.status = 'submitted'
          data.reservedUntil = reservationExpiry(now).toISOString()
          if (!data.customer && req.user?.collection === 'customers') data.customer = req.user.id
          return data
        }

        const from = originalDoc?.status as QuoteStatus | undefined
        const to = data.status as QuoteStatus | undefined
        if (from && to && !canTransition(from, to) && !req.context?.skipTransitionCheck) {
          throw new APIError(
            `A quote can't move from ${QUOTE_STATUS_LABELS[from]} to ${QUOTE_STATUS_LABELS[to]}.`,
            400,
            undefined,
            true,
          )
        }
        if (to === 'quoted' && from !== 'quoted') {
          data.quotedAt = now.toISOString()
          data.expiresAt = quoteExpiry(now).toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'ref',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'QR-YYYY-####, set automatically.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'submitted',
      index: true,
      options: QUOTE_STATUSES.map((value) => ({ value, label: QUOTE_STATUS_LABELS[value] })),
      access: { update: isStaffField },
      admin: { position: 'sidebar' },
    },
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true, admin: { position: 'sidebar' } },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      admin: { description: 'Snapshot of the basket at submission.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'lot', type: 'relationship', relationTo: 'lots', required: true },
            { name: 'qty', type: 'number', required: true, min: 1 },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'sku', type: 'text', required: true },
            { name: 'guideSubtotalPence', type: 'number', admin: { description: 'Empty = quote only.' } },
            { name: 'quotedSubtotalPence', type: 'number', access: { update: isStaffField } },
          ],
        },
      ],
    },
    { name: 'notes', type: 'textarea', label: 'Buyer notes' },
    {
      name: 'details',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'company', type: 'text', required: true },
            { name: 'contactName', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'phone', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'vatNumber', type: 'text', label: 'VAT / company no.' },
            { name: 'country', type: 'text', required: true },
            { name: 'postcode', type: 'text', label: 'Delivery postcode' },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'shippingMethod',
              type: 'select',
              options: [
                { label: 'Collect from warehouse', value: 'collect' },
                { label: 'UK courier', value: 'uk-courier' },
                { label: 'Pallet', value: 'pallet' },
                { label: 'International', value: 'international' },
              ],
            },
            {
              name: 'paymentPreference',
              type: 'select',
              options: [
                { label: 'Bank transfer', value: 'bank-transfer' },
                { label: 'Card payment link', value: 'card-link' },
              ],
            },
            { name: 'deadline', type: 'date' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Staff',
      admin: { initCollapsed: false },
      fields: [
        { name: 'internalNotes', type: 'textarea', access: { read: isStaffField, update: isStaffField } },
        { name: 'quotePdf', type: 'upload', relationTo: 'media', access: { update: isStaffField } },
        {
          type: 'row',
          fields: [
            { name: 'reservedUntil', type: 'date', admin: { readOnly: true } },
            { name: 'quotedAt', type: 'date', admin: { readOnly: true } },
            { name: 'expiresAt', type: 'date', admin: { readOnly: true } },
          ],
        },
      ],
    },
  ],
}
