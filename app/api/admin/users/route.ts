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
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { cpf: { contains: search } },
    ]
  }
  if (status) where.status = status

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { wallet: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        cpf: u.cpf,
        phone: u.phone,
        role: u.role,
        status: u.status,
        balance: u.wallet?.balance ?? 0,
        minWithdraw: u.minWithdraw ?? 0,
        withdrawEnabled: u.withdrawEnabled ?? true,
        createdAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[ADMIN USERS ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
