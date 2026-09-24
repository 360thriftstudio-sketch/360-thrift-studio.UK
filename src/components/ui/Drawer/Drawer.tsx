'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Hide the title visually but keep it for screen readers. */
  hideTitle?: boolean
  side?: 'left' | 'right'
  /** full = full-screen on mobile (filters, menu); sheet = side sheet. */
  size?: 'full' | 'sheet'
  children: ReactNode
  footer?: ReactNode
}

/**
 * Slide-in panel on Radix Dialog: focus trap, Esc to close, focus returns to trigger.
 * Motion: 280 ms --ease-brand slide; backdrop 200 ms fade (reduced-motion → fade only).
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  hideTitle,
  side = 'right',
  size = 'sheet',
  children,
  footer,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          data-side={side}
          aria-describedby={undefined}
          className={cn(
            'drawer-content fixed inset-y-0 z-50 flex flex-col bg-surface shadow-pop',
            side === 'right' ? 'right-0' : 'left-0',
            size === 'full' ? 'w-full md:w-[420px]' : 'w-[min(420px,100vw)]',
          )}
        >
          <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
            <Dialog.Title className={cn('text-lg font-bold', hideTitle && 'sr-only')}>{title}</Dialog.Title>
            <Dialog.Close className="ml-auto inline-flex size-11 items-center justify-center rounded-pill hover:bg-line/60">
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer ? <footer className="border-t border-line p-4">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
