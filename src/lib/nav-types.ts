import type { BrandLogoMode } from './brand-logos'

export type NavLink = { label: string; href: string }

export type NavBrand = NavLink & {
  mode: BrandLogoMode
  logoUrl?: string
}

export type SiteNav = {
  shop: { column1: NavLink[]; column2: NavLink[]; quick: NavLink[] }
  brands: { featured: NavBrand[]; more: NavLink[] }
  styles: NavLink[]
  catalogue: NavLink
  trade: NavLink[]
  announcement: { text: string; href?: string } | null
  contact: { email?: string | null; phone?: string | null; whatsapp?: string | null }
}
