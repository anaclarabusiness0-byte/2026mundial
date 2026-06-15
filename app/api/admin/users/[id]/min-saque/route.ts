import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { minWithdraw } = await req.json()
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { minWithdraw: Number(minWithdraw) },
    })
    return NextResponse.json({ success: true, minWithdraw: user.minWithdraw })
  } catch (err) {
    console.error('[MIN SAQUE ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
