import { z } from 'zod'

/** Shared client/server validation (React forms + API routes). */

const text = (label: string, max = 120) => z.string().trim().min(1, `Enter ${label}`).max(max)
const optional = (max = 200) => z.string().trim().max(max).optional().or(z.literal(''))

export const SHIPPING_METHODS = [
  { value: 'collect', label: 'Collect from warehouse' },
  { value: 'uk-courier', label: 'UK courier' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'international', label: 'International' },
] as const

export const PAYMENT_PREFS = [
  { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'card-link', label: 'Card payment link' },
] as const

export const rfqDetailsSchema = z.object({
  company: text('your company name'),
  contactName: text('your name'),
  email: z.string().trim().email('Enter an email address like name@company.com'),
  phone: optional(40),
  vatNumber: optional(40),
  country: text('your country', 80),
  postcode: optional(20),
  shippingMethod: z.enum(['collect', 'uk-courier', 'pallet', 'international'], { message: 'Choose a shipping method' }),
  paymentPreference: z.enum(['bank-transfer', 'card-link'], { message: 'Choose a payment preference' }),
  deadline: optional(20),
})
export type RfqDetails = z.infer<typeof rfqDetailsSchema>

export const rfqSchema = z.object({
  lines: z
    .array(z.object({ lotId: z.string().min(1), qty: z.number().int().min(1).max(999) }))
    .min(1, 'Your basket is empty')
    .max(100),
  details: rfqDetailsSchema,
  notes: optional(2000),
  consent: z.literal(true, { message: 'Tick to confirm we can contact you about this quote' }),
})

/** Soft check only — never blocks submit. GB 9/12 digits, or EU-style prefix + 8–12 chars. */
export function vatLooksValid(v: string): boolean {
  const s = v.replace(/[\s.-]/g, '').toUpperCase()
  if (!s) return true
  return /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/.test(s) || /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(s)
}

export const ENQUIRY_TYPES = ['trade-account', 'luxury', 'contact', 'newsletter', 'warehouse-visit'] as const

export const enquirySchema = z.object({
  type: z.enum(ENQUIRY_TYPES),
  name: optional(120),
  email: z.string().trim().email('Enter an email address like name@company.com'),
  company: optional(120),
  phone: optional(40),
  country: optional(80),
  message: optional(3000),
  fields: z.record(z.string(), z.string().max(500)).optional(),
  website: z.string().max(0).optional(), // honeypot — must stay empty
})

export const registerSchema = z.object({
  company: text('your company name'),
  contactName: text('your name'),
  email: z.string().trim().email('Enter an email address like name@company.com'),
  password: z.string().min(10, 'Use at least 10 characters'),
  country: text('your country', 80),
  phone: optional(40),
  vatNumber: optional(40),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Enter your email address'),
  password: z.string().min(1, 'Enter your password'),
})

/** Flatten zod issues to { field: message } for inline errors + error summary. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
