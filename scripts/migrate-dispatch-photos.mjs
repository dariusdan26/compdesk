import 'dotenv/config'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

// Check if column already exists (idempotent)
const info = await client.execute(`PRAGMA table_info("DispatchChecklist")`)
const hasColumn = info.rows.some((row) => row.name === 'photoUrls')

if (hasColumn) {
  console.log('OK: photoUrls column already exists — skipping')
} else {
  await client.execute(`ALTER TABLE "DispatchChecklist" ADD COLUMN "photoUrls" TEXT`)
  console.log('OK: added photoUrls column')
}

const verify = await client.execute(`PRAGMA table_info("DispatchChecklist")`)
console.log('Verify columns:', verify.rows.map((r) => r.name).join(', '))
