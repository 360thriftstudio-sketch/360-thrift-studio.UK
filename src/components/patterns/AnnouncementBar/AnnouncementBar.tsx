import Link from 'next/link'

export function AnnouncementBar({ text, href }: { text: string; href?: string }) {
  return (
    <div className="bg-ink text-bg">
      <p className="container-site py-2 text-center text-sm font-medium">
        {href ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </p>
    </div>
  )
}
