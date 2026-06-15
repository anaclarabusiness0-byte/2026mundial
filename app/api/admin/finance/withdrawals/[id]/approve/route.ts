import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const payment = await prisma.pixPayment.findUnique({ where: { id: params.id } })
    if (!payment) return NextResponse.json({ message: 'Pagamento não encontrado' }, { status: 404 })
    if (payment.status !== 'PENDING') {
      return NextResponse.json({ message: 'Pagamento não está pendente' }, { status: 400 })
    }

    const updated = await prisma.pixPayment.update({
      where: { id: params.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    await logAudit({
      adminId: auth.user.id,
      action: 'APPROVE_WITHDRAWAL',
      entity: 'PixPayment',
      entityId: params.id,
      before: { status: 'PENDING' },
      after: { status: 'PAID' },
    })

    return NextResponse.json({ success: true, payment: updated })
  } catch (err) {
    console.error('[APPROVE WITHDRAWAL ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
