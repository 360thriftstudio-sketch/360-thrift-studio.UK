'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Section entry on scroll: fade + 16 px rise, once, at 15% visible.
 * Content is visible by default (no JS = no hidden content); only elements
 * that start below the fold are hidden and then revealed.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (el.getBoundingClientRect().top < window.innerHeight) return
     
    setState('hidden')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState('shown')
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={state === 'static' ? className : `reveal ${className ?? ''}`}
      data-shown={state === 'shown'}
      style={state === 'static' ? undefined : { transitionDelay: `${Math.min(delay, 6) * 60}ms` }}
    >
      {children}
    </div>
  )
}
