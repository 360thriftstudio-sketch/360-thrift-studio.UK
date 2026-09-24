import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { collections } from './collections'
import { Users } from './collections/Users'
import { Settings } from './globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL || ''

/**
 * Postgres in production (schema via migrations in src/migrations).
 * A `file:` DATABASE_URL switches to SQLite — used for zero-setup preview
 * deploys; the schema is pushed by `pnpm seed` and the file is disposable.
 */
const db = databaseUrl.startsWith('file:')
  ? sqliteAdapter({ client: { url: databaseUrl }, push: true })
  : postgresAdapter({
      pool: { connectionString: databaseUrl },
      // Schema changes ship as migrations: `pnpm migrate:create` after editing
      // collections, `pnpm migrate` before start/seed. PAYLOAD_DB_PUSH=true
      // for quick local prototyping only.
      push: process.env.PAYLOAD_DB_PUSH === 'true',
      migrationDir: path.resolve(dirname, 'migrations'),
    })

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' — 360 Thrift Studio admin' },
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections,
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db,
  sharp,
})
