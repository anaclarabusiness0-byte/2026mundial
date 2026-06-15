import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { amount, operation } = await req.json()
    if (!amount || !['ADD', 'SUBTRACT', 'SET'].includes(operation)) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: params.id } })
    if (!wallet) return NextResponse.json({ message: 'Carteira não encontrada' }, { status: 404 })

    let newBalance: number
    const current = Number(wallet.balance)

    if (operation === 'ADD') newBalance = current + Number(amount)
    else if (operation === 'SUBTRACT') newBalance = Math.max(0, current - Number(amount))
    else newBalance = Number(amount)

    const updated = await prisma.wallet.update({
      where: { userId: params.id },
      data: { balance: newBalance },
    })

    await logAudit({
      adminId: auth.user.id,
      action: `BALANCE_${operation}`,
      entity: 'Wallet',
      entityId: params.id,
      before: { balance: current },
      after: { balance: newBalance },
    })

    return NextResponse.json({ success: true, balance: updated.balance })
  } catch (err) {
    console.error('[BALANCE UPDATE ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
