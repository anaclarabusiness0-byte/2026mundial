import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const settings = await prisma.setting.findMany({ orderBy: { group: 'asc' } })
    return NextResponse.json({ settings })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { key, value, type, group } = await req.json()
    if (!key || value === undefined) {
      return NextResponse.json({ message: 'key e value são obrigatórios' }, { status: 400 })
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value), type, group, updatedBy: auth.user.id },
      create: { key, value: String(value), type: type || 'string', group: group || 'general', updatedBy: auth.user.id },
    })

    return NextResponse.json({ success: true, setting })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
