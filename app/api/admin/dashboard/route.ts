import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const [totalUsers, activeUsers, totalDeposits, totalWithdrawals, pendingWithdrawals] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.pixPayment.aggregate({
          where: { type: 'DEPOSIT', status: 'PAID' },
          _sum: { amount: true },
        }),
        prisma.pixPayment.aggregate({
          where: { type: 'WITHDRAWAL', status: 'PAID' },
          _sum: { amount: true },
        }),
        prisma.pixPayment.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
      ])

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalDeposits: totalDeposits._sum.amount ?? 0,
      totalWithdrawals: totalWithdrawals._sum.amount ?? 0,
      pendingWithdrawals,
    })
  } catch (err) {
    console.error('[DASHBOARD ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
