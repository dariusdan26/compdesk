import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { anthropic } from '@/lib/claude'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
import mammoth from 'mammoth'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx')

async function restructurePdfWithClaude(rawText: string, filename: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are processing raw text extracted from a PDF technical data sheet. PDF extraction often scrambles multi-column layouts — values may appear separated from their labels, table rows may be out of order, and sections may be interleaved.

Your job is to reconstruct this into a clean, accurate, well-structured markdown document.

Rules:
- Correctly associate ALL property names with their values — do not leave any value unassociated
- Preserve every numerical value exactly as written (do not round, convert, or alter any numbers or units)
- Preserve all test conditions, standards references (e.g. ASTM D638), and notes exactly
- Organize into logical sections using ## markdown headers (e.g. Description, Features, Applications, Liquid Resin Properties, Cured Resin Properties, Shelf Life, etc.)
- Use markdown tables for property/value data where appropriate
- Do not add any information not present in the source text
- Do not omit any information from the source text
- Remove repeated boilerplate like company address, phone numbers, and legal disclaimers

Filename: ${filename}

Raw extracted text:
${rawText}`
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : rawText
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = file.name.toLowerCase()

  let text = ''
  const isPdf = filename.endsWith('.pdf')
  const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls')

  try {
    if (isPdf) {
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else if (isXlsx) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetEntries: { title: string; content: string }[] = []

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (rows.length === 0) continue

        // Filter out __EMPTY placeholder columns (blank columns in Excel)
        const allHeaders = Object.keys(rows[0])
        const headers = allHeaders.filter(h => !h.startsWith('__EMPTY'))
        if (headers.length === 0) continue

        // Filter rows where all real columns are empty
        const dataRows = rows.filter(row => headers.some(h => String(row[h] ?? '').trim() !== ''))
        if (dataRows.length === 0) continue

        // Clean header names (remove embedded newlines)
        const cleanHeaders = headers.map(h => h.replace(/\n/g, ' ').trim())

        const lines: string[] = []
        lines.push('| ' + cleanHeaders.join(' | ') + ' |')
        lines.push('| ' + cleanHeaders.map(() => '---').join(' | ') + ' |')

        for (const row of dataRows) {
          const cells = headers.map(h => {
            const val = row[h]
            // Round floats to max 4 decimal places to avoid floating-point noise
            const str = typeof val === 'number' && !Number.isInteger(val)
              ? parseFloat(val.toFixed(4)).toString()
              : String(val ?? '')
            return str.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
          })
          lines.push('| ' + cells.join(' | ') + ' |')
        }

        sheetEntries.push({ title: sheetName, content: lines.join('\n') })
      }

      // Return multiple entries (one per sheet) for batch saving
      const fileTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      return NextResponse.json({
        multiEntry: true,
        entries: sheetEntries.map(s => ({
          title: `${fileTitle} — ${s.title}`,
          content: s.content,
          category: 'Vendors & Suppliers',
        })),
      })
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, or XLSX file.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to parse file. Make sure it is not password-protected or corrupted.' }, { status: 422 })
  }

  // Clean up the extracted text
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!text) {
    return NextResponse.json({ error: 'No readable text found in this file.' }, { status: 422 })
  }

  // For PDFs, run through Claude to fix scrambled multi-column layout
  if (isPdf) {
    try {
      const restructured = await restructurePdfWithClaude(text, file.name)
      if (restructured.trim()) text = restructured
      // else: keep raw text if Claude returned empty
    } catch {
      // If Claude restructuring fails, fall back to raw extracted text
    }
  }

  const suggestedTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  return NextResponse.json({
    text,
    suggestedTitle,
    ...(isXlsx && { autoSave: true, category: 'Vendors & Suppliers' }),
  })
}
