import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const bets = await prisma.mundialBet.findMany({
      where: { status: 'OPEN' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ bets })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { betId, side, amount } = await req.json()
    if (!betId || !side || !amount) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    const bet = await prisma.mundialBet.findUnique({ where: { id: betId } })
    if (!bet || bet.status !== 'OPEN') {
      return NextResponse.json({ message: 'Aposta não disponível' }, { status: 400 })
    }

    const odd = side === 'sim' ? bet.simOdd : bet.naoOdd
    const potentialWin = Number(amount) * odd

    const wallet = await prisma.wallet.findUnique({ where: { userId: auth.user.id } })
    if (!wallet || Number(wallet.balance) < Number(amount)) {
      return NextResponse.json({ message: 'Saldo insuficiente' }, { status: 400 })
    }

    const userBet = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: auth.user.id },
        data: { balance: { decrement: Number(amount) } },
      })
      return tx.userMundialBet.create({
        data: { userId: auth.user.id, betId, side, amount: Number(amount), odd, potentialWin },
      })
    })

    return NextResponse.json({ success: true, userBet }, { status: 201 })
  } catch (err) {
    console.error('[MUNDIAL BET ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
