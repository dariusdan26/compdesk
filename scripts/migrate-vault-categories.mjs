// Retags categories on existing SDSDocument + TDSDocument rows (and matching
// KnowledgeEntry rows) using the new taxonomy. Defaults to dry-run; pass
// `--apply` to actually write changes.
//
//   node scripts/migrate-vault-categories.mjs           # dry run
//   node scripts/migrate-vault-categories.mjs --apply   # write changes

import 'dotenv/config'
import { createClient } from '@libsql/client'

const APPLY = process.argv.includes('--apply')

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

// Mirror of inferCategory() in scripts/vault-sync.mjs — must stay in sync.
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
  if (/norester|\bi\s*-?\s*\d{2,}|\bcr\s*\d{2,}|\d{3}\s*-?\s*\d{2}\s*series|series.*(?:dcpd|close\s*mold)|iso\s*series|ve\s*series|dcpd|laminating/.test(n)) return 'Laminating Resins'
  if (/gelcoat|polygel|\bgc\s?\d/.test(n)) return 'Gelcoats'
  if (/^(?:cem\s+)?(?:100|200|250|490|500|550|920)(?:\s|$)/.test(n)) return 'Gelcoats'
  return 'General'
}

// The `filename` column holds the storedFilename with underscores in place of
// spaces, which breaks \b word boundaries in inferCategory. Use the title
// (human-readable) as the matching input; fall back to the underscore-stripped
// filename if title is missing.
function matchInput(row) {
  const candidate = String(row.title || row.filename || '')
  return candidate.replace(/_+/g, ' ')
}

async function planTable(table) {
  const rows = await db.execute(`SELECT id, title, filename, category FROM ${table}`)
  return rows.rows.map(r => {
    const newCat = inferCategory(matchInput(r))
    return { id: Number(r.id), title: String(r.title), filename: String(r.filename), current: String(r.category), next: newCat }
  })
}

async function planKnowledge() {
  const rows = await db.execute(`SELECT id, title, category FROM KnowledgeEntry WHERE title LIKE 'SDS Vault/%' OR title LIKE 'TDS Vault/%'`)
  return rows.rows.map(r => {
    const title = String(r.title)
    const baseTitle = title.replace(/^(SDS|TDS) Vault\//, '')
    const newCat = inferCategory(baseTitle)
    return { id: Number(r.id), title, current: String(r.category), next: newCat }
  })
}

function summarize(label, plan) {
  const changes = plan.filter(p => p.current !== p.next)
  const buckets = new Map()
  for (const c of changes) {
    const k = `${c.current} → ${c.next}`
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  console.log(`\n=== ${label} ===`)
  console.log(`${plan.length} rows total, ${changes.length} will change`)
  for (const [k, v] of [...buckets.entries()].sort()) {
    console.log(`  ${v.toString().padStart(3)}  ${k}`)
  }
  return changes
}

function detail(changes) {
  for (const c of changes) {
    console.log(`    [${c.id}] ${c.title || c.filename || '?'}  (${c.current} → ${c.next})`)
  }
}

async function apply(table, changes) {
  for (const c of changes) {
    await db.execute({
      sql: `UPDATE ${table} SET category = ? WHERE id = ?`,
      args: [c.next, c.id],
    })
  }
}

const sdsPlan = await planTable('SDSDocument')
const tdsPlan = await planTable('TDSDocument')
const kbPlan  = await planKnowledge()

const sdsChanges = summarize('SDSDocument', sdsPlan)
const tdsChanges = summarize('TDSDocument', tdsPlan)
const kbChanges  = summarize('KnowledgeEntry (vault entries)', kbPlan)

if (process.argv.includes('--detail')) {
  console.log('\n--- SDS changes ---')
  detail(sdsChanges)
  console.log('\n--- TDS changes ---')
  detail(tdsChanges)
  console.log('\n--- KB changes ---')
  detail(kbChanges)
}

if (!APPLY) {
  console.log(`\nDry run. Re-run with --apply to write ${sdsChanges.length + tdsChanges.length + kbChanges.length} updates.`)
  process.exit(0)
}

await apply('SDSDocument', sdsChanges)
await apply('TDSDocument', tdsChanges)
await apply('KnowledgeEntry', kbChanges)
console.log(`\nApplied ${sdsChanges.length + tdsChanges.length + kbChanges.length} updates.`)
