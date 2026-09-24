/** Serialise JSON-LD safely for a <script> tag (CMS text can't close the tag). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
