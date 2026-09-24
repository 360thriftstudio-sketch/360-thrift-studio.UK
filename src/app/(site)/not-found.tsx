import Link from 'next/link'

import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <section className="container-site grid min-h-[50vh] place-content-center gap-4 py-24 text-center">
      <h1 className="text-3xl">We couldn’t find that page</h1>
      <p className="text-ink-muted">It may have sold, moved, or not be built yet.</p>
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href="/shop">Browse the catalogue</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </section>
  )
}
