import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ message: 'Nenhum arquivo enviado' }, { status: 400 })

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

    if (!privateKey || !urlEndpoint) {
      return NextResponse.json({ message: 'Configuração de upload ausente' }, { status: 500 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const credentials = Buffer.from(`${privateKey}:`).toString('base64')

    const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: `${Date.now()}_${file.name}`,
        folder: '/chinabet',
      }),
    })

    const result = await uploadRes.json()
    if (!uploadRes.ok) {
      console.error('[IMAGEKIT ERROR]', result)
      return NextResponse.json({ message: 'Erro no upload para ImageKit' }, { status: 500 })
    }

    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error('[UPLOAD ERROR]', err)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
