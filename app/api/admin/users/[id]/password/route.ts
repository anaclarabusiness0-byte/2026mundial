import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const { password } = await req.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ message: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
