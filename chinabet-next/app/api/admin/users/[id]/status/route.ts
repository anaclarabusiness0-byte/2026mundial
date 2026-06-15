import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { status } = await req.json()
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
    }

    const before = await prisma.user.findUnique({ where: { id: params.id } })
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { status },
    })

    await logAudit({
      adminId: auth.user.id,
      action: 'UPDATE_STATUS',
      entity: 'User',
      entityId: params.id,
      before: { status: before?.status },
      after: { status },
    })

    return NextResponse.json({ success: true, status: user.status })
  } catch (err) {
    console.error('[UPDATE STATUS ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
