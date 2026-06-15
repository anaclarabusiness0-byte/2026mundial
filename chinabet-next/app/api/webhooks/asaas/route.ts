import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, payment } = body

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const pix = await prisma.pixPayment.findUnique({ where: { txid: payment.id } })
      if (!pix || pix.status === 'PAID') return NextResponse.json({ ok: true })

      await prisma.$transaction(async (tx) => {
        await tx.pixPayment.update({
          where: { txid: payment.id },
          data: { status: 'PAID', paidAt: new Date() },
        })

        if (pix.type === 'DEPOSIT') {
          await tx.wallet.update({
            where: { userId: pix.userId },
            data: { balance: { increment: Number(pix.amount) } },
          })
        }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
