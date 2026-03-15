// One-time migration script: uploads local PDF files to Vercel Blob and inserts Turso records
// Run with: node scripts/migrate-uploads.mjs

import { put } from '@vercel/blob'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@libsql/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Config
const BLOB_TOKEN = 'vercel_blob_rw_zaa8gk9gbhh5ZOJe_2MIGAT9gFloE5FbDIRS8IWsIgCAhss'
const DATABASE_URL = 'libsql://compdesk-dariusdan26.aws-us-east-1.turso.io'
const DATABASE_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzM0MzM5NDYsImlkIjoiMDE5Y2U4ZTQtY2MwMS03YTUzLTk5MWQtMzM0YmVhZTVkNWEyIiwicmlkIjoiMmQ2Nzk4N2EtMWU5MS00YmVkLWFlMDktNjA2ODEyNjdkZTFlIn0.q4Lv54ura_4kqQZ6xo9uIcMDIvAUiSQFHXwvKB3M36q8Fa1_2sjSSvybmlMUfAEHEfFF8KDt1M6KsCfWEtDLBQ'

// Known manufacturer prefixes to extract from filenames
const MANUFACTURERS = ['NORESTER', 'POLYMOLD', 'POLYFILLER', 'POLYCORE', 'NORDCORE', 'NORD_CORE', 'CEM']

function deriveMetadata(storedFilename, type) {
  // storedFilename = "uuid_SDS_Vault_NORESTER_877_SDS.pdf" or "uuid_TDS_Vault_White_Spray.pdf"
  // Strip UUID prefix (first segment before first underscore that looks like a UUID)
  const withoutUuid = storedFilename.replace(/^[0-9a-f-]{36}_/, '')

  // Strip "SDS_Vault_" or "TDS_Vault_" prefix
  const withoutVault = withoutUuid
    .replace(/^SDS_Vault_/i, '')
    .replace(/^TDS_Vault_/i, '')
    .replace(/^TDS_-_/i, '')
    .replace(/^SDS_-_/i, '')

  // Strip extension
  const withoutExt = withoutVault.replace(/\.pdf$/i, '').replace(/\.docx\.pdf$/i, '')

  // Build human-readable title
  const title = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Try to extract manufacturer from known brands
  let manufacturer = null
  const upperTitle = title.toUpperCase()
  for (const brand of MANUFACTURERS) {
    if (upperTitle.startsWith(brand.replace(/_/g, ' '))) {
      manufacturer = brand.replace(/_/g, ' ')
      // Capitalize properly: CEM stays CEM, others title-case
      if (manufacturer.length > 3) {
        manufacturer = manufacturer.charAt(0) + manufacturer.slice(1).toLowerCase()
          .replace(/\b\w/g, c => c.toUpperCase())
      }
      break
    }
  }

  const category = type === 'sds' ? 'Safety Data Sheet' : 'Technical Data Sheet'

  return { title, manufacturer, category }
}

async function migrateType(type, tableName) {
  const dir = join(ROOT, 'public', 'uploads', type)
  const files = readdirSync(dir).filter(f => f.endsWith('.pdf'))
  console.log(`\n📁 Migrating ${files.length} ${type.toUpperCase()} files...`)

  const db = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })

  let succeeded = 0
  let failed = 0

  for (const filename of files) {
    const filePath = join(dir, filename)
    const buffer = readFileSync(filePath)
    const fileSize = statSync(filePath).size
    const { title, manufacturer, category } = deriveMetadata(filename, type)

    try {
      // Upload to Vercel Blob
      const blob = await put(`${type}/${filename}`, buffer, {
        access: 'public',
        token: BLOB_TOKEN,
      })

      // Insert into Turso
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      await db.execute({
        sql: `INSERT INTO ${tableName} (title, manufacturer, category, filename, filePath, fileSize, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [title, manufacturer, category, filename, blob.url, fileSize, now],
      })

      console.log(`  ✅ ${title}`)
      succeeded++
    } catch (err) {
      console.error(`  ❌ ${filename}: ${err.message}`)
      failed++
    }
  }

  return { succeeded, failed }
}

async function main() {
  console.log('🚀 Starting migration of local uploads → Vercel Blob + Turso\n')

  const sds = await migrateType('sds', 'SDSDocument')
  const tds = await migrateType('tds', 'TDSDocument')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`SDS: ${sds.succeeded} succeeded, ${sds.failed} failed`)
  console.log(`TDS: ${tds.succeeded} succeeded, ${tds.failed} failed`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Migration complete!')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
