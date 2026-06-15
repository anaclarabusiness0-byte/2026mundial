import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.setting.findMany({
      where: { group: { in: ['general', 'public'] } },
    })
    const map: Record<string, string> = {}
    settings.forEach(s => { map[s.key] = s.value })
    return NextResponse.json({ settings: map })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
