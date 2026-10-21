import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendDesks = async () => {
        try {
          const desks = await sql`
            SELECT 
              d.desk_id AS id, 
              d.row_label AS row, 
              d.seat_number AS seat, 
              CASE 
                WHEN s.session_id IS NOT NULL THEN LOWER(s.status)
                WHEN d.status = 'maintenance' THEN 'maintenance'
                ELSE 'free'
              END AS status,
              d.has_power AS "hasPower", 
              d.is_window AS "isWindow", 
              d.location, 
              d.updated_at,
              s.session_id AS "sessionId",
              s.student_id AS "occupantId",
              st.name AS "occupantName",
              st.reg_no AS "occupantRegNo",
              st.email AS "occupantEmail",
              s.start_time AS "occupiedSince"
            FROM "Desk" d
            LEFT JOIN "Session" s ON s.desk_id = d.desk_id AND s.status IN ('ACTIVE', 'AWAY')
            LEFT JOIN "Student" st ON st.student_id = s.student_id
            ORDER BY d.desk_id ASC
          `
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(desks)}\n\n`))
        } catch (err: any) {
          console.error('[SSE Error]', err.message)
        }
      }

      // Initial push
      await sendDesks()

      // Poll interval for light server-sent updates (every 3s)
      const interval = setInterval(sendDesks, 3000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
