import { prisma } from './prisma'

interface AuditParams {
  adminId?: string
  userId?: string
  action: string
  entity: string
  entityId?: string
  before?: object
  after?: object
  ip?: string
}

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({ data: params })
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err)
  }
}
