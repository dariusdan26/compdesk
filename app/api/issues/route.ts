import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { anthropic } from '@/lib/claude'
import { notifyNewIssue } from '@/lib/email'

async function triageWithClaude(description: string, category: string, urgency: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are an operations assistant for a composites distribution and manufacturing company. A staff member has reported the following issue.

Category: ${category}
Urgency: ${urgency}
Description: ${description}

Provide a brief, practical first-response triage. Include:
1. Immediate steps the staff member should take right now
2. Who they should notify (supervisor, safety officer, maintenance, etc.)
3. Any relevant safety precautions if applicable

Keep it concise — 3 to 5 sentences maximum. Write directly to the staff member.`,
    }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const where = user.role === 'admin' ? {} : { submittedBy: userId }
  const issues = await prisma.issue.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(issues)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number }
  const userId = Number(user.id)
  const { description, category, urgency } = await req.json()

  if (!description?.trim() || !category || !urgency) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  // Get AI triage before saving
  let aiResponse = ''
  try {
    aiResponse = await triageWithClaude(description, category, urgency)
  } catch {
    // Non-blocking — save without AI response if it fails
  }

  const issue = await prisma.issue.create({
    data: { submittedBy: userId, description, category, urgency, status: 'open', aiResponse },
    include: { user: { select: { name: true } } },
  })

  // Fire-and-forget email notification
  notifyNewIssue({
    submittedBy: issue.user.name,
    category: issue.category,
    urgency: issue.urgency,
    description: issue.description,
  }).catch(() => {})

  return NextResponse.json(issue, { status: 201 })
}
