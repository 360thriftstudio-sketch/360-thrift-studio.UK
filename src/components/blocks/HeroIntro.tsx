'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const KEY = 'thrift360.introPlayed'

/**
 * StudioLogo intro (≤ 1.2 s, once per session via sessionStorage). Never blocks
 * content — the page renders underneath; this only animates the logo in place.
 * Build 4 swaps the CSS animation for the supplied dotLottie file.
 */
export function HeroIntro() {
  const [intro, setIntro] = useState(false)
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1')
        // eslint-disable-next-line react-hooks/set-state-in-effect -- once-per-session flag lives in browser storage
        setIntro(true)
      }
    } catch {
      // storage blocked → static logo
    }
  }, [])
  return (
    <Image
      src="/brand/studio-logo-circle.webp"
      alt="360° Thrift Studio — Vintage · Premium · Wholesale, surrounded by garments in a circle"
      width={520}
      height={520}
      priority
      fetchPriority="high"
      data-intro={intro}
      className="hero-logo relative h-auto w-full max-w-[520px] drop-shadow-[8px_8px_0_rgba(0,0,0,0.9)]"
      sizes="(min-width: 1024px) 520px, 80vw"
    />
  )
}
