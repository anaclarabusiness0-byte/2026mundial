import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(5).max(100),
  email: z.string().email(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parse = schema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ errors: parse.error.flatten().fieldErrors }, { status: 400 })
    }

    const { username, fullName, email, cpf, phone, password } = parse.data

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { cpf }, { username }] },
    })
    if (exists) {
      return NextResponse.json({ message: 'Email, CPF ou usuário já cadastrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { username, fullName, email, cpf, phone, passwordHash },
      })
      await tx.wallet.create({ data: { userId: u.id, balance: 0 } })
      return u
    })

    const token = generateToken(user.id, user.role)
    return NextResponse.json({ token, userId: user.id }, { status: 201 })
  } catch (err) {
    console.error('[REGISTER ERROR]', err)
    return NextResponse.json({ message: 'Erro interno ao registrar usuário' }, { status: 500 })
  }
}
