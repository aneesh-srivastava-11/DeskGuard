import { NextRequest, NextResponse } from 'next/server'
import { verifyQRToken } from '@/lib/crypto-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) {
    return NextResponse.json(
      { error: 'unauthorized' }, { status: 401 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' }, { status: 401 }
    )
  }

  const { deskId, token: qrToken } = await req.json()
  if (!deskId || !qrToken) {
    return NextResponse.json(
      { error: 'missing_params' }, { status: 400 }
    )
  }

  const payload = await verifyQRToken(qrToken)
  if (!payload || payload.deskId !== deskId) {
    return NextResponse.json(
      { error: 'invalid_token' }, { status: 400 }
    )
  }

  if (Date.now() / 1000 - payload.iat > 60) {
    return NextResponse.json(
      { error: 'token_expired' }, { status: 400 }
    )
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!student) {
    return NextResponse.json(
      { error: 'student_not_found' }, { status: 404 }
    )
  }

  const { data, error } = await supabaseAdmin
    .rpc('checkin_desk', {
      p_desk_id: deskId,
      p_student_id: student.id
    })

  if (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }

  if (data?.error) {
    return NextResponse.json(
      { error: data.error }, { status: 409 }
    )
  }

  return NextResponse.json({ 
    success: true, 
    session: data?.session 
  })
}
