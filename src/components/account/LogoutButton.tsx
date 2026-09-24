'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true)
        await fetch('/api/customers/logout', { method: 'POST', credentials: 'include' }).catch(() => null)
        router.refresh()
        setBusy(false)
      }}
    >
      <LogOut aria-hidden className="size-4" /> Log out
    </Button>
  )
}
