import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { anthropic } from '@/lib/claude'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
import mammoth from 'mammoth'

async function analyzeWithClaudeVision(buffer: Buffer, filename: string): Promise<string> {
  const base64 = buffer.toString('base64')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: `This PDF appears to contain a visual diagram or flow chart rather than plain text. Please read and describe the complete content of this document as a structured SOP.
- If it is a flow chart or process diagram, describe each step, decision point, and path in order
- Use ## markdown headers to organize sections
- Preserve all labels, values, conditions, and annotations exactly
- Format it so a worker can follow the procedure step by step
Filename: ${filename}`,
        },
      ],
    }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function restructureWithClaude(rawText: string, filename: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are processing raw text extracted from a PDF Standard Operating Procedure (SOP). PDF extraction often scrambles layouts — sections may be out of order or interleaved.

Your job is to reconstruct this into a clean, accurate, well-structured markdown document suitable for an SOP library.

Rules:
- Organize into logical sections using ## markdown headers (e.g. Purpose, Scope, Responsibilities, Procedure, Safety Notes, References)
- Preserve all numbered steps and their order exactly
- Preserve all safety warnings, specifications, and standards references exactly
- Do not add any information not present in the source text
- Do not omit any information from the source text
- Remove repeated boilerplate like company address, phone numbers, and legal disclaimers

Filename: ${filename}

Raw extracted text:
${rawText}`,
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
  const isPdf = filename.endsWith('.pdf')

  let text = ''

  try {
    if (isPdf) {
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to parse file. Make sure it is not password-protected or corrupted.' }, { status: 422 })
  }

  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  let usedVision = false
  if (!text && isPdf) {
    try {
      text = await analyzeWithClaudeVision(buffer, file.name)
      usedVision = true
    } catch {
      // fall through to error below
    }
  }

  if (!text) {
    return NextResponse.json({ error: 'No readable text found in this file.' }, { status: 422 })
  }

  if (isPdf && !usedVision) {
    try {
      const restructured = await restructureWithClaude(text, file.name)
      if (restructured.trim()) text = restructured
    } catch {
      // fall back to raw text
    }
  }

  const suggestedTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  return NextResponse.json({ text, suggestedTitle })
}
