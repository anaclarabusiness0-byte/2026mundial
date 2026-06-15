import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { paymentId: string } }) {
  const auth = requireAuth(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const payment = await prisma.pixPayment.findUnique({ where: { id: params.paymentId } })
    if (!payment) return NextResponse.json({ message: 'Pagamento não encontrado' }, { status: 404 })
    if (payment.userId !== auth.user.id && auth.user.role === 'USER') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json({ status: payment.status, payment })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
