import { Sidebar } from '@/components/sidebar/sidebar'
import { MobileBottomNav } from '@/components/sidebar/mobile-bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-full m-0 p-0 min-h-screen flex flex-col font-sans select-none overflow-x-hidden">
      <div className="flex-1 w-full max-w-full m-0 p-0 flex flex-col md:flex-row min-h-screen relative">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      {/* Footer */}
      <footer className="hidden md:flex w-full py-2 bg-[var(--surface)] border-t border-[var(--border-custom)] relative z-10 items-center justify-center px-6">
        <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider text-center">
          DeskGuard Library Portal System • Verified University Terminal No L41-SEC
        </p>
      </footer>
    </div>
  )
}
