import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { amount, type, pixKey } = await req.json()

    if (!amount || !type || !['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    if (type === 'WITHDRAWAL') {
      const user = await prisma.user.findUnique({
        where: { id: auth.user.id },
        include: { wallet: true },
      })
      if (!user?.withdrawEnabled) {
        return NextResponse.json({ message: 'Saque não liberado para este usuário' }, { status: 403 })
      }
      if (Number(user.wallet?.balance ?? 0) < Number(amount)) {
        return NextResponse.json({ message: 'Saldo insuficiente' }, { status: 400 })
      }
      if (user.minWithdraw && Number(amount) < Number(user.minWithdraw)) {
        return NextResponse.json({ message: `Valor mínimo de saque: R$ ${user.minWithdraw}` }, { status: 400 })
      }

      // Debita o saldo
      await prisma.wallet.update({
        where: { userId: auth.user.id },
        data: { balance: { decrement: Number(amount) } },
      })
    }

    // Chama Asaas
    const asaasKey = process.env.ASAAS_API_KEY
    const asaasBase = process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3'

    let qrCode = null
    let txid = `local_${Date.now()}`

    if (asaasKey && type === 'DEPOSIT') {
      try {
        const customer = await prisma.user.findUnique({ where: { id: auth.user.id } })
        const res = await fetch(`${asaasBase}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', access_token: asaasKey },
          body: JSON.stringify({
            customer: customer?.asaasId,
            billingType: 'PIX',
            value: Number(amount),
            dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0],
          }),
        })
        const data = await res.json()
        txid = data.id || txid
        qrCode = data.pixQrCodeImage || null
      } catch (e) {
        console.error('[ASAAS ERROR]', e)
      }
    }

    const payment = await prisma.pixPayment.create({
      data: {
        userId: auth.user.id,
        txid,
        amount: Number(amount),
        type,
        pixKey: pixKey || null,
        qrCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    return NextResponse.json({ success: true, payment, qrCode }, { status: 201 })
  } catch (err) {
    console.error('[PIX CREATE ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
