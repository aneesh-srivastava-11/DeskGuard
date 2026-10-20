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
            SELECT desk_id AS id, row_label AS row, seat_number AS seat, status,
                   has_power AS "hasPower", is_window AS "isWindow", location, updated_at
            FROM "Desk"
            ORDER BY desk_id ASC
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
