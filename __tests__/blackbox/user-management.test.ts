import { describe, it, expect, beforeEach } from 'vitest'
import { resetTestDb } from '@/lib/db'
import { POST, GET } from '@/app/api/admin/users/route'
import { NextRequest } from 'next/server'

describe('Blackbox: User Management API (/api/admin/users)', () => {
  beforeEach(() => {
    resetTestDb()
  })

  it('TC-USER-01: creates an individual student user successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kabir Verma',
        email: 'kabir.2024@muj.manipal.edu',
        regNo: 'MUJ2024CSE0888',
        role: 'student',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.user.name).toBe('Kabir Verma')
    expect(data.user.reg_no).toBe('MUJ2024CSE0888')
    expect(data.user.role).toBe('student')
  })

  it('TC-USER-02: creates a librarian user and infers role from email', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Library Admin 2',
        email: 'admin2@jaipur.manipal.edu',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.user.role).toBe('librarian')
  })

  it('TC-USER-03: rejects single user creation if name or email is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'nobody@muj.manipal.edu',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('TC-USER-04: bulk imports a batch of users from array', async () => {
    const usersBatch = [
      { name: 'Student One', email: 's1@muj.manipal.edu', regNo: 'REG001', role: 'student' },
      { name: 'Student Two', email: 's2@muj.manipal.edu', regNo: 'REG002', role: 'student' },
      { name: 'Librarian Staff', email: 'staff@jaipur.manipal.edu', regNo: 'LIB099', role: 'librarian' },
    ]

    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: usersBatch }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.total).toBe(3)
    expect(data.imported + data.updated).toBe(3)
  })

  it('TC-USER-05: lists users and supports search queries', async () => {
    // Seed test users
    const seedReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Divya Aggarwal',
        email: 'divya@muj.manipal.edu',
        regNo: 'MUJ2024IT999',
      }),
    })
    await POST(seedReq)

    const listReq = new NextRequest('http://localhost:3000/api/admin/users?search=Divya')
    const listRes = await GET(listReq)
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listData.success).toBe(true)
    expect(listData.users.some((u: any) => u.name === 'Divya Aggarwal')).toBe(true)
  })
})
