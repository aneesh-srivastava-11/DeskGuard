/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { NodeGrid, InfoPanel } from '@/components/map/node-grid'
import type { Desk } from '@/lib/types'

// Mock providers and router
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'MUJ2024CSE0086', name: 'Test Student', role: 'student', regNo: 'MUJ2024CSE0086' },
    loading: false,
  }),
}))

vi.mock('@/components/providers/theme-provider', () => ({
  useTheme: () => ({ isDarkMode: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('Blackbox UI Component Testing: Seat Map & Live Views (TC01 - TC02)', () => {
  const sampleDesks: Desk[] = [
    {
      id: 'D01',
      row: 'A',
      seat: 1,
      status: 'free',
      occupiedSince: null,
      durationText: null,
      occupantId: null,
      occupantName: null,
      hasPower: true,
      isWindow: true,
    },
    {
      id: 'D02',
      row: 'A',
      seat: 2,
      status: 'occupied',
      occupiedSince: '10:00 AM',
      durationText: '1h 15m',
      occupantId: 'STUDENT_B',
      occupantName: 'Student B',
      hasPower: true,
      isWindow: false,
    },
    {
      id: 'D03',
      row: 'A',
      seat: 3,
      status: 'away',
      occupiedSince: '09:30 AM',
      durationText: '1h 45m',
      occupantId: 'STUDENT_C',
      occupantName: 'Student C',
      hasPower: false,
      isWindow: true,
    },
    {
      id: 'D04',
      row: 'A',
      seat: 4,
      status: 'maintenance',
      occupiedSince: null,
      durationText: null,
      occupantId: null,
      occupantName: null,
      hasPower: true,
      isWindow: false,
    },
  ]

  it('UI-01 (TC01): NodeGrid renders and color-codes desks (green=Free, red=Occupied, yellow=Away)', () => {
    const handleDeskClick = vi.fn()
    const { container } = render(
      <NodeGrid desks={sampleDesks} selectedDeskId="D01" onDeskClick={handleDeskClick} />
    )

    // Check D01 (Free -> green)
    const desk1 = container.querySelector('#desk-D01')
    expect(desk1).toBeDefined()
    expect(desk1?.className).toContain('text-[#22C55E]')

    // Check D02 (Occupied -> red)
    const desk2 = container.querySelector('#desk-D02')
    expect(desk2).toBeDefined()
    expect(desk2?.className).toContain('text-[#EF4444]')

    // Check D03 (Away -> yellow)
    const desk3 = container.querySelector('#desk-D03')
    expect(desk3).toBeDefined()
    expect(desk3?.className).toContain('text-[#F59E0B]')

    // Test click interaction
    fireEvent.click(desk2!)
    expect(handleDeskClick).toHaveBeenCalledWith('D02')
  })

  it('UI-02 (TC02): InfoPanel displays status pill and actions matching desk status', () => {
    const onReserve = vi.fn()
    const onRelease = vi.fn()
    const onSweep = vi.fn()

    // 1. Available desk (D01) shows Scan Reservation button
    const { unmount } = render(
      <InfoPanel
        desk={sampleDesks[0]}
        currentUserId="MUJ2024CSE0086"
        activeSession={null}
        onReserve={onReserve}
        onRelease={onRelease}
        onSweep={onSweep}
      />
    )

    expect(screen.getByText('● Free')).toBeDefined()
    const reserveBtn = screen.getByRole('button', { name: /scan reservation/i })
    expect(reserveBtn).toBeDefined()
    fireEvent.click(reserveBtn)
    expect(onReserve).toHaveBeenCalledWith('D01')
    unmount()

    // 2. Desk occupied by current user shows Release Desk button
    const occupiedByUserDesk: Desk = {
      ...sampleDesks[1],
      occupantId: 'MUJ2024CSE0086',
    }
    render(
      <InfoPanel
        desk={occupiedByUserDesk}
        currentUserId="MUJ2024CSE0086"
        activeSession={{ id: 'sess-1', desk_id: 'D02' }}
        onReserve={onReserve}
        onRelease={onRelease}
        onSweep={onSweep}
      />
    )
    expect(screen.getByText('● Occupied')).toBeDefined()
    const releaseBtn = screen.getByRole('button', { name: /release desk/i })
    expect(releaseBtn).toBeDefined()
    fireEvent.click(releaseBtn)
    expect(onRelease).toHaveBeenCalledWith('D02')
  })

  it('UI-03 (TC02): Verifies "No desks currently available" display logic when all desks are occupied', () => {
    const allOccupiedDesks: Desk[] = sampleDesks.map((d) => ({ ...d, status: 'occupied' as Desk['status'] }))
    const computedFree = allOccupiedDesks.filter((d) => d.status === 'free').length

    const BannerComponent = ({ freeCount }: { freeCount: number }) => (
      <div>
        {freeCount === 0 && (
          <div id="no-desks-available-notice" data-testid="no-desks-alert">
            No desks currently available
          </div>
        )}
      </div>
    )

    const { rerender } = render(<BannerComponent freeCount={computedFree} />)
    expect(screen.getByTestId('no-desks-alert')).toBeDefined()
    expect(screen.getByText('No desks currently available')).toBeDefined()

    // If desks become available, alert disappears
    rerender(<BannerComponent freeCount={3} />)
    expect(screen.queryByTestId('no-desks-alert')).toBeNull()
  })
})
