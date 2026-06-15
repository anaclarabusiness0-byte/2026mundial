import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
      include: { wallet: true },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 })
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ message: 'Conta suspensa ou banida' }, { status: 403 })
    }

    const token = generateToken(user.id, user.role)
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        balance: user.wallet?.balance ?? 0,
      },
    })
  } catch (err) {
    console.error('[LOGIN ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
