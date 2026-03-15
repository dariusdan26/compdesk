// One-time migration: copy KnowledgeEntry rows from local dev.db → Turso
// Run with: node scripts/migrate-knowledge.mjs

import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const DATABASE_URL = 'libsql://compdesk-dariusdan26.aws-us-east-1.turso.io'
const DATABASE_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzM0MzM5NDYsImlkIjoiMDE5Y2U4ZTQtY2MwMS03YTUzLTk5MWQtMzM0YmVhZTVkNWEyIiwicmlkIjoiMmQ2Nzk4N2EtMWU5MS00YmVkLWFlMDktNjA2ODEyNjdkZTFlIn0.q4Lv54ura_4kqQZ6xo9uIcMDIvAUiSQFHXwvKB3M36q8Fa1_2sjSSvybmlMUfAEHEfFF8KDt1M6KsCfWEtDLBQ'

const local = new Database(join(ROOT, 'dev.db'), { readonly: true })
const turso = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })

const rows = local.prepare('SELECT * FROM KnowledgeEntry ORDER BY id').all()
console.log(`Found ${rows.length} knowledge entries in local dev.db\n`)

let succeeded = 0
let failed = 0

for (const row of rows) {
  try {
    await turso.execute({
      sql: `INSERT INTO KnowledgeEntry (category, title, content, createdAt) VALUES (?, ?, ?, ?)`,
      args: [row.category, row.title, row.content, row.createdAt],
    })
    console.log(`  ✅ [${row.category}] ${row.title}`)
    succeeded++
  } catch (err) {
    console.error(`  ❌ ${row.title}: ${err.message}`)
    failed++
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`${succeeded} succeeded, ${failed} failed`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
local.close()
