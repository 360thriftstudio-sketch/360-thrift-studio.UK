import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, Ref } from 'react'

import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Render the child element (e.g. a Next <Link>) with button styling. */
  asChild?: boolean
  ref?: Ref<HTMLButtonElement>
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none ' +
  'transition-[transform,background-color,color,box-shadow] duration-[var(--dur-fast)] ease-out ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
  'data-[loading=true]:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 rounded-md',
  secondary: 'bg-surface text-ink border border-line hover:border-ink rounded-md',
  ghost: 'bg-transparent text-ink hover:bg-line/60 rounded-md',
  link: 'bg-transparent text-accent underline underline-offset-4 hover:no-underline p-0',
  icon: 'bg-transparent text-ink hover:bg-line/60 rounded-pill',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-13 px-6 text-lg',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-13',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  className,
  children,
  disabled,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(
        base,
        variants[variant],
        variant === 'icon' ? iconSizes[size] : variant !== 'link' && sizes[size],
        className,
      )}
      {...props}
    >
      {loading && !asChild ? (
        <span className="relative inline-flex items-center justify-center">
          <span className="invisible">{children}</span>
          <Loader2 aria-hidden className="absolute size-5 animate-spin" />
          <span className="sr-only">Loading</span>
        </span>
      ) : (
        children
      )}
    </Comp>
  )
}
