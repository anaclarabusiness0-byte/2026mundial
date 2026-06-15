import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || ''

  const where: any = { type: 'WITHDRAWAL' }
  if (status) where.status = status

  try {
    const [total, withdrawals] = await Promise.all([
      prisma.pixPayment.count({ where }),
      prisma.pixPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Busca usuários separadamente
    const userIds = [...new Set(withdrawals.map(d => d.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, fullName: true, email: true },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const result = withdrawals.map(d => ({ ...d, user: userMap[d.userId] || null }))

    return NextResponse.json({ withdrawals: result, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[WITHDRAWALS ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
