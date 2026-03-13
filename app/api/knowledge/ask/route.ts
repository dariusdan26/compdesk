import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { anthropic } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 })

  // Fetch all knowledge entries
  const allEntries = await prisma.knowledgeEntry.findMany({
    orderBy: { category: 'asc' },
  })

  // Keyword-based relevance scoring + strict token budget
  // Rate limit is 30k input tokens/min. Target ~5k tokens per query for knowledge section.
  // ~4 chars per token → 20k char budget. Hard cap at 5 entries.
  const CHAR_BUDGET = 20_000
  const MAX_ENTRIES = 5
  const MAX_ENTRY_CHARS = 6_000 // truncate any single entry beyond this
  const STOPWORDS = new Set(['a','an','the','is','it','in','on','of','to','for','and','or','what','how','does','do','can','be','are','was','with','my','i','me','we','our','this','that','at','by','as'])

  let entries: Array<typeof allEntries[0] & { content: string }> = allEntries
  if (allEntries.length > 0) {
    const keywords = question.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))

    if (keywords.length > 0) {
      // Build a phrase from the original question (stripped, no stopwords) for bonus matching
      const cleanQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

      const scored = allEntries.map(entry => {
        const titleLower = entry.title.toLowerCase()
        const hay = `${entry.category} ${titleLower} ${entry.content}`.toLowerCase()

        let score = keywords.reduce((n, kw) => {
          // Word-boundary regex prevents "200" matching inside "2000" or "1200"
          const wb = new RegExp(`\\b${kw}\\b`, 'gi')
          const titleHits = (titleLower.match(wb) ?? []).length * 5   // title match = 5×
          const bodyHits  = (hay.match(wb) ?? []).length
          return n + titleHits + bodyHits
        }, 0)

        // Phrase bonus: reward entries whose title contains consecutive keyword pairs
        // e.g. "cem 200" appearing together in title scores much higher than individual hits
        for (let i = 0; i < keywords.length - 1; i++) {
          const phrase = keywords[i] + ' ' + keywords[i + 1]
          if (titleLower.includes(phrase)) score += 30
          else if (hay.includes(phrase))   score += 10
        }
        // Also check if the full clean question (or 3-word chunks) appears in title
        if (titleLower.includes(cleanQuestion)) score += 50

        return { entry, score }
      })
      scored.sort((a, b) => b.score - a.score)
      entries = scored.map(s => s.entry)
    }

    // Apply budget — enforce from first entry, truncate large entries, hard cap at MAX_ENTRIES
    let total = 0
    const selected: typeof entries = []
    for (const entry of entries) {
      if (selected.length >= MAX_ENTRIES) break
      const content = entry.content.length > MAX_ENTRY_CHARS
        ? entry.content.slice(0, MAX_ENTRY_CHARS) + '\n[content truncated]'
        : entry.content
      const size = entry.title.length + content.length + 20
      if (total + size > CHAR_BUDGET && selected.length > 0) break
      selected.push({ ...entry, content })
      total += size
    }
    entries = selected
  }

  let knowledgeSection = ''
  if (entries.length === 0) {
    knowledgeSection = 'No company knowledge has been added yet.'
  } else {
    const grouped: Record<string, typeof entries> = {}
    for (const entry of entries) {
      if (!grouped[entry.category]) grouped[entry.category] = []
      grouped[entry.category].push(entry)
    }
    knowledgeSection = Object.entries(grouped)
      .map(([cat, items]) =>
        `## ${cat}\n` +
        items.map(e => `### ${e.title}\n${e.content}`).join('\n\n')
      )
      .join('\n\n')
  }

  const systemPrompt = `You are a knowledgeable assistant for a composites distribution and manufacturing company. Your job is to answer staff questions accurately using the company knowledge base below.

Rules:
- Answer using only the information in the knowledge base. If the answer is there, cite which section it came from (e.g. "Based on the Resin Types section...").
- If the knowledge base does not contain enough information to answer the question, say so clearly. Do not guess or make up information.
- If you don't know, suggest who to ask (e.g. "You may want to check with the production lead or the owner for this one.").
- Keep answers concise and practical. Staff are on the production floor — they need clear, direct answers.
- If the question is about safety, always err on the side of caution.

--- COMPANY KNOWLEDGE BASE ---

${knowledgeSection}

--- END OF KNOWLEDGE BASE ---`

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 429) {
      return NextResponse.json(
        { error: 'rate_limit', answer: "The AI is receiving too many requests right now. Please wait 30–60 seconds and try again." },
        { status: 429 }
      )
    }
    throw err
  }

  const answer = response.content[0].type === 'text' ? response.content[0].text : ''

  // Log the question
  const user = session.user as { id: string }
  await prisma.questionLog.create({
    data: {
      userId: parseInt(user.id),
      question: question.trim(),
      answer,
    },
  })

  return NextResponse.json({ answer })
}
