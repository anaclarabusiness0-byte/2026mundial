import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const SECRET = process.env.JWT_SECRET!

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { sub: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as any
  } catch {
    return null
  }
}

export function getAuth(req: NextRequest): { id: string; role: string } | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.split(' ')[1]
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null
  return { id: decoded.sub, role: decoded.role }
}

export function requireAuth(req: NextRequest) {
  const user = getAuth(req)
  if (!user) return { error: 'Token obrigatório', status: 401 }
  return { user }
}

export function requireAdmin(req: NextRequest) {
  const user = getAuth(req)
  if (!user) return { error: 'Token obrigatório', status: 401 }
  if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
    return { error: 'Acesso negado', status: 403 }
  }
  return { user }
}
