import { Arrow } from '@/components/brand/Graphics'
import { EnquiryForm } from '@/components/forms/EnquiryForm'

export function Newsletter() {
  return (
    <section aria-labelledby="news" className="container-site py-16">
      <div className="grid gap-6 rounded-lg border-2 border-ink bg-surface p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
        <div className="grid content-start gap-2">
          <h2 id="news" className="text-4xl">New lots every week</h2>
          <p className="text-ink-muted">Restock alerts and new assortments, straight to your inbox. We confirm by email before adding you.</p>
          <Arrow className="w-20 rotate-12" />
        </div>
        <EnquiryForm
          type="newsletter"
          submitLabel="Sign me up"
          success="Check your inbox to confirm your sign-up."
          fields={[
            { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            { name: 'interests', label: 'Sections you buy most', hint: 'e.g. Puffers, Denim, Bags' },
          ]}
        />
      </div>
    </section>
  )
}
