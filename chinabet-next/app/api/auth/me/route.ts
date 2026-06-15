import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: { wallet: true },
    })
    if (!user) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      role: user.role,
      status: user.status,
      balance: user.wallet?.balance ?? 0,
      minWithdraw: user.minWithdraw ?? 0,
      withdrawEnabled: user.withdrawEnabled ?? true,
      createdAt: user.createdAt,
    })
  } catch (err) {
    console.error('[ME ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
