/**
 * Vault Sync — watches the SDS and TDS Vault folders on the Desktop
 * and automatically keeps the CompDesk database + uploads in sync.
 *
 * On file ADD:   parse PDF/DOCX → Claude restructure → copy to uploads → insert DB rows
 * On file DELETE: remove uploaded file + delete SDSDocument/TDSDocument + KnowledgeEntry rows
 *
 * Also runs a full reconciliation on startup to catch any changes that
 * happened while the script wasn't running.
 *
 * Usage:  npm run vault-sync
 */

import { createClient } from '@libsql/client'
import Anthropic from '@anthropic-ai/sdk'
import { put, del } from '@vercel/blob'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local'), override: true })

// ── Config ────────────────────────────────────────────────────────────────────

const SDS_VAULT_DIR = '/Users/dariusdan/Desktop/SDS Vault'
const TDS_VAULT_DIR = '/Users/dariusdan/Desktop/TDS Vault'

const VAULTS = [
  { dir: SDS_VAULT_DIR, label: 'SDS Vault', table: 'SDSDocument', sub: 'sds' },
  { dir: TDS_VAULT_DIR, label: 'TDS Vault', table: 'TDSDocument', sub: 'tds' },
]

// ── DB + AI ───────────────────────────────────────────────────────────────────

const db = createClient({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a human-readable title from a filename, matching the app's convention */
function titleFromFilename(filename) {
  const ext = path.extname(filename)
  return path.basename(filename, ext).replace(/[-_]/g, ' ').trim()
}

/** Return the vault config for a given file path, or null if not in a known vault */
function vaultForPath(filePath) {
  return VAULTS.find(v => filePath.startsWith(v.dir)) ?? null
}

function isSupportedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath)
  return (ext === '.pdf' || ext === '.docx') && !base.startsWith('.')
}

// Order matters — most specific rules first; "General" is the fallback.
// Categories must match the curated lists in app/admin/{sds,tds}/*Admin.tsx
function inferCategory(filename) {
  const n = filename.toLowerCase()

  if (/\bthinner\b|\bacetone\b/.test(n)) return 'Solvents & Cleaners'

  if (/peel\s*ply|matline/.test(n)) return 'Process Materials'

  if (/nidaplast|nidagravel|nidajet|nord\s*core|\bncl\s*\d|pet\s*foam/.test(n)) return 'Core Materials'

  if (/polycolor/.test(n)) return 'Pigments & Colorants'

  if (/promoter|promotor|sanding\s*aid|\blpa\b|polysealer|\bsealer\b/.test(n)) return 'Additives & Promoters'

  if (/\bmma\b|methacrylate|nord\s*230|accrochage|abs\s*\d{3}/.test(n)) return 'Adhesives'

  if (/putty|transom/.test(n)) return 'Putties & Fillers'

  if (/marble|onyx|\bcbu\s*\d|\bm[5-8]\d{2}\b/.test(n)) return 'Tooling Gelcoats'

  if (/polymold|polyskin|polycore/.test(n)) return 'Tooling Resins & Cores'

  if (/primer|filler|appret|polygloss|\bgloss\b|laquer|lacquer|suncoat/.test(n)) return 'Primers & Topcoats'

  // Laminating signals: iso/CR series, two-segment series codes (e.g. "380 20 SERIES"),
  // DCPD/iso/VE-series markers, NORESTER product line.
  if (/norester|\bi\s*-?\s*\d{2,}|\bcr\s*\d{2,}|\d{3}\s*-?\s*\d{2}\s*series|series.*(?:dcpd|close\s*mold)|iso\s*series|ve\s*series|dcpd|laminating/.test(n)) return 'Laminating Resins'

  if (/gelcoat|polygel|\bgc\s?\d/.test(n)) return 'Gelcoats'

  // Known CEM gelcoat product numbers (bare 3-digit codes with no I-/CR-/M-/ABS-/PC-/ST-/GC- prefix)
  if (/^(?:cem\s+)?(?:100|200|250|490|500|550|920)(?:\s|$)/.test(n)) return 'Gelcoats'

  return 'General'
}

// ── Parsing ───────────────────────────────────────────────────────────────────

async function restructureWithClaude(rawText, filename) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are processing raw text extracted from a PDF technical data sheet or safety data sheet. PDF extraction often scrambles multi-column layouts.

Your job is to reconstruct this into a clean, accurate, well-structured markdown document.

Rules:
- Correctly associate ALL property names with their values
- Preserve every numerical value exactly as written
- Preserve all standards references, hazard codes, and notes exactly
- Organize into logical sections using ## markdown headers
- Use markdown tables for property/value data where appropriate
- Do not add any information not present in the source text
- Do not omit any information from the source text
- Remove repeated boilerplate like company address, phone numbers, and legal disclaimers

Filename: ${filename}

Raw extracted text:
${rawText}`,
      }],
    })
    return response.content[0].type === 'text' ? response.content[0].text : rawText
  } catch (err) {
    console.warn(`  ⚠ Claude restructuring failed for ${filename}, using raw text: ${err.message}`)
    return rawText
  }
}

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const buffer = fs.readFileSync(filePath)

  if (ext === '.pdf') {
    const parsed = await pdfParse(buffer)
    let text = parsed.text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) throw new Error('No readable text found in PDF')
    text = await restructureWithClaude(text, path.basename(filePath))
    return text
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

// ── Add file ──────────────────────────────────────────────────────────────────

async function addFile(filePath) {
  const vault = vaultForPath(filePath)
  if (!vault) return

  const filename = path.basename(filePath)
  const baseTitle = titleFromFilename(filename)
  const fullTitle = `${vault.label}/${baseTitle}`

  // Skip if already in DB (idempotent) — document table uses baseTitle, KnowledgeEntry uses fullTitle
  const existing = await db.execute({ sql: `SELECT id FROM ${vault.table} WHERE title = ?`, args: [baseTitle] })
  if (existing.rows.length > 0) return

  console.log(`[${vault.label}] Adding: ${filename}`)

  // Parse + restructure
  let content
  try {
    content = await parseFile(filePath)
  } catch (err) {
    console.error(`  ✗ Failed to parse ${filename}: ${err.message}`)
    return
  }

  if (!content) {
    console.warn(`  ✗ No content extracted from ${filename}, skipping`)
    return
  }

  // Upload file to Vercel Blob
  const uuid = randomUUID()
  const safeBase = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storedFilename = `${uuid}_${vault.label.replace(/ /g, '_')}_${safeBase}`
  const fileBuffer = fs.readFileSync(filePath)
  const fileSize = fileBuffer.length

  const blob = await put(`${vault.sub}/${storedFilename}`, fileBuffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  const webPath = blob.url

  // Insert document row — title stored WITHOUT vault prefix (consistent with admin uploads)
  await db.execute({
    sql: `INSERT INTO ${vault.table} (title, manufacturer, category, filename, filePath, fileSize, createdAt)
          VALUES (?, NULL, ?, ?, ?, ?, datetime('now'))`,
    args: [baseTitle, inferCategory(filename), storedFilename, webPath, fileSize],
  })

  // Insert knowledge entry — title stored WITH vault prefix to distinguish SDS vs TDS
  await db.execute({
    sql: `INSERT INTO KnowledgeEntry (title, category, content, createdAt, updatedAt)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    args: [fullTitle, inferCategory(filename), content],
  })

  console.log(`  ✓ Added: ${baseTitle}`)
}

// ── Remove file ───────────────────────────────────────────────────────────────

async function removeFile(filePath) {
  const vault = vaultForPath(filePath)
  if (!vault) return

  const filename = path.basename(filePath)
  const baseTitle = titleFromFilename(filename)
  const fullTitle = `${vault.label}/${baseTitle}`

  console.log(`[${vault.label}] Removing: ${filename}`)

  // Find and delete document row(s) — document table uses baseTitle
  const rows = await db.execute({
    sql: `SELECT id, filename, filePath FROM ${vault.table} WHERE title = ?`,
    args: [baseTitle],
  })

  for (const row of rows.rows) {
    const storedFilePath = row[2] // filePath column
    try {
      if (storedFilePath && storedFilePath.startsWith('https://')) {
        await del(storedFilePath, { token: process.env.BLOB_READ_WRITE_TOKEN })
      }
    } catch { /* already gone or not a blob URL */ }
    await db.execute({ sql: `DELETE FROM ${vault.table} WHERE id = ?`, args: [row[0]] })
  }

  // Delete knowledge entry
  await db.execute({ sql: `DELETE FROM KnowledgeEntry WHERE title = ?`, args: [fullTitle] })

  console.log(`  ✓ Removed: ${baseTitle}`)
}

// ── Reconcile on startup ──────────────────────────────────────────────────────

async function reconcile() {
  console.log('\nReconciling vaults with database...')

  for (const vault of VAULTS) {
    // Vault files currently on disk — use baseTitle for document table, fullTitle for KnowledgeEntry
    const vaultFiles = fs.readdirSync(vault.dir).filter(f => isSupportedFile(f))
    const vaultBaseTitles = new Set(vaultFiles.map(f => titleFromFilename(f)))

    // DB entries for this vault
    const { rows: dbRows } = await db.execute(`SELECT id, title, filename FROM ${vault.table}`)

    // 1. Remove stale DB entries (file was deleted from vault while script was off)
    for (const row of dbRows) {
      const dbTitle = row[1] // baseTitle in document table
      if (!vaultBaseTitles.has(dbTitle)) {
        const storedFilePath = row[2]
        const fullTitle = `${vault.label}/${dbTitle}`
        console.log(`[${vault.label}] Stale: ${dbTitle} — removing`)
        try {
          if (storedFilePath && String(storedFilePath).startsWith('https://')) {
            await del(String(storedFilePath), { token: process.env.BLOB_READ_WRITE_TOKEN })
          }
        } catch { /* already gone */ }
        await db.execute({ sql: `DELETE FROM ${vault.table} WHERE id = ?`, args: [row[0]] })
        await db.execute({ sql: `DELETE FROM KnowledgeEntry WHERE title = ?`, args: [fullTitle] })
      }
    }

    // 2. Add vault files not yet in DB (file was added to vault while script was off)
    const dbBaseTitles = new Set(dbRows.map(r => r[1]))
    for (const f of vaultFiles) {
      const baseTitle = titleFromFilename(f)
      if (!dbBaseTitles.has(baseTitle)) {
        await addFile(path.join(vault.dir, f))
      }
    }
  }

  console.log('Reconciliation complete.\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await reconcile()

  const watcher = chokidar.watch([SDS_VAULT_DIR, TDS_VAULT_DIR], {
    ignoreInitial: true,
    ignored: /(^|[/\\])\./,  // ignore dotfiles
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
  })

  watcher
    .on('add', filePath => {
      if (!isSupportedFile(filePath)) return
      addFile(filePath).catch(err => console.error('Error adding file:', err))
    })
    .on('unlink', filePath => {
      removeFile(filePath).catch(err => console.error('Error removing file:', err))
    })
    .on('error', err => console.error('Watcher error:', err))

  console.log('Watching:')
  console.log(`  ${SDS_VAULT_DIR}`)
  console.log(`  ${TDS_VAULT_DIR}`)
  console.log('\nReady — drop or delete files in the vaults and the knowledge base will sync automatically.')
  console.log('Press Ctrl+C to stop.\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
