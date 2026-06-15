import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const bets = await prisma.mundialBet.findMany({
      include: { options: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ bets })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const data = await req.json()
    const bet = await prisma.mundialBet.create({
      data: {
        title: data.title,
        description: data.description,
        imageData: data.imageData,
        simLabel: data.simLabel || 'SIM',
        naoLabel: data.naoLabel || 'NÃO',
        simOdd: data.simOdd || 1.90,
        naoOdd: data.naoOdd || 1.90,
        simPercent: data.simPercent || 50,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })
    return NextResponse.json({ success: true, bet }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { id, result } = await req.json()
    if (!id || !result) return NextResponse.json({ message: 'id e result são obrigatórios' }, { status: 400 })

    // Resolve bet and settle user bets
    const bet = await prisma.mundialBet.findUnique({ where: { id }, include: { userBets: true } })
    if (!bet) return NextResponse.json({ message: 'Aposta não encontrada' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.mundialBet.update({ where: { id }, data: { result, status: 'RESOLVED' } })

      for (const ub of bet.userBets) {
        if (ub.status !== 'PENDING') continue
        const won = ub.side === result
        await tx.userMundialBet.update({
          where: { id: ub.id },
          data: { status: won ? 'WON' : 'LOST', resolvedAt: new Date() },
        })
        if (won) {
          await tx.wallet.update({
            where: { userId: ub.userId },
            data: { balance: { increment: Number(ub.potentialWin) } },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
