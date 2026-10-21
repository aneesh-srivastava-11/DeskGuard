import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, bulkImportUsers, listUsers, type UserInput } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const role = searchParams.get('role') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100

    const result = await listUsers({ search, role, limit })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Bulk Import Mode
    if (body.users && Array.isArray(body.users)) {
      const result = await bulkImportUsers(body.users as UserInput[])
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json(result, { status: 200 })
    }

    // Single User Mode
    const userPayload: UserInput = {
      id: body.id,
      name: body.name,
      email: body.email,
      regNo: body.regNo || body.reg_no,
      role: body.role,
      branch: body.branch,
      batchYear: body.batchYear || body.batch_year,
    }

    if (!userPayload.name || !userPayload.email) {
      return NextResponse.json({ error: 'Name and email are required fields' }, { status: 400 })
    }

    const result = await createOrUpdateUser(userPayload)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process user creation' }, { status: 500 })
  }
}
