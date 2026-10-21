import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let val = match[2] || ''
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (!process.env[key]) process.env[key] = val
      }
    })
  }
}

loadEnvLocal()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL || DATABASE_URL.includes('ep-sample-123456')) {
  console.error('\x1b[31m[Error] Please configure a valid DATABASE_URL in .env.local before running the seed script.\x1b[0m')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function seed() {
  console.log('\x1b[36m──────────────────────────────────────────────────────────────────\x1b[0m')
  console.log('\x1b[33m[DeskGuard] Seeding 1 Librarian and 3 Students into Neon DB...\x1b[0m')
  console.log('\x1b[36m──────────────────────────────────────────────────────────────────\x1b[0m')

  // 1. Seed Librarian
  const librarian = {
    id: 'lib_01',
    name: 'Head Librarian',
    email: 'librarian@jaipur.manipal.edu',
    role: 'librarian',
  }

  try {
    await sql`
      INSERT INTO "Student" (student_id, reg_no, name, email, role)
      VALUES (${librarian.id}, 'LIB-001', ${librarian.name}, ${librarian.email}, ${librarian.role})
      ON CONFLICT (student_id) DO UPDATE
      SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;
    `

    await sql`
      INSERT INTO "Librarian" (librarian_id, name, email)
      VALUES (${librarian.id}, ${librarian.name}, ${librarian.email})
      ON CONFLICT (librarian_id) DO UPDATE
      SET name = EXCLUDED.name, email = EXCLUDED.email;
    `
    console.log(`\x1b[32m✔ Seeded Librarian:\x1b[0m ${librarian.name} (${librarian.email})`)
  } catch (err) {
    console.warn(`\x1b[33m⚠ Librarian table notice:\x1b[0m ${err.message}`)
  }

  // 2. Seed 3 Students
  const students = [
    {
      id: 'std_01',
      regNo: 'MUJ2024CSE0086',
      name: 'Aneesh Srivastava',
      email: 'aneesh.219301001@muj.manipal.edu',
    },
    {
      id: 'std_02',
      regNo: 'MUJ2024ECE0042',
      name: 'Rohan Sharma',
      email: 'rohan.219302042@muj.manipal.edu',
    },
    {
      id: 'std_03',
      regNo: 'MUJ2024IT0115',
      name: 'Priya Patel',
      email: 'priya.219303115@muj.manipal.edu',
    },
  ]

  for (const s of students) {
    try {
      await sql`
        INSERT INTO "Student" (student_id, reg_no, name, email, role)
        VALUES (${s.id}, ${s.regNo}, ${s.name}, ${s.email}, 'student')
        ON CONFLICT (student_id) DO UPDATE
        SET reg_no = EXCLUDED.reg_no, name = EXCLUDED.name, email = EXCLUDED.email;
      `
      console.log(`\x1b[32m✔ Seeded Student:\x1b[0m ${s.name} [${s.regNo}] (${s.email})`)
    } catch (err) {
      console.error(`\x1b[31m✖ Failed to seed student ${s.name}:\x1b[0m ${err.message}`)
    }
  }

  console.log('\x1b[36m──────────────────────────────────────────────────────────────────\x1b[0m')
  console.log('\x1b[32m✔ Seeding Complete! 1 Librarian and 3 Students ready in PostgreSQL.\x1b[0m')
  console.log('\x1b[36m──────────────────────────────────────────────────────────────────\x1b[0m')
}

seed().catch((err) => {
  console.error('[Seeding Error]', err)
  process.exit(1)
})
