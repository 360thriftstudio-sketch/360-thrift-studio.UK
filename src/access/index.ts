import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

/** Staff are users in the `users` collection (the admin). Buyers are `customers`. */
export const isStaffUser = (req: PayloadRequest): boolean => req.user?.collection === 'users'

export const isStaff: Access = ({ req }) => isStaffUser(req)
export const isStaffField: FieldAccess = ({ req }) => isStaffUser(req)
export const isAdmin: Access = ({ req }) =>
  isStaffUser(req) && (req.user as { role?: string } | null)?.role === 'admin'

export const anyone: Access = () => true

/** Staff see everything; the public only sees published documents. */
export const publishedOrStaff: Access = ({ req }): boolean | Where => {
  if (isStaffUser(req)) return true
  return { status: { equals: 'published' } }
}

/** Staff see everything; a customer only sees their own records. */
export const ownCustomerOrStaff =
  (field: string): Access =>
  ({ req }): boolean | Where => {
    if (isStaffUser(req)) return true
    if (req.user?.collection === 'customers') return { [field]: { equals: req.user.id } }
    return false
  }
