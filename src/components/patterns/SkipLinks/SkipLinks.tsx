const link =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md ' +
  'focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-pop'

/** "Skip to content" always; "Skip to filters" on listing pages. */
export function SkipLinks({ filters = false }: { filters?: boolean }) {
  return (
    <>
      <a href="#main" className={link}>
        Skip to content
      </a>
      {filters ? (
        <a href="#filters" className={link}>
          Skip to filters
        </a>
      ) : null}
    </>
  )
}
