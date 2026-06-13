import { Sidebar } from '@/components/sidebar/sidebar'
import { MobileBottomNav } from '@/components/sidebar/mobile-bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex flex-col font-sans select-none overflow-x-hidden">
      <div className="flex-1 w-full max-w-[1440px] mx-auto flex flex-col md:flex-row min-h-screen relative">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      {/* Footer */}
      <footer className="hidden md:flex w-full h-12 bg-[#13131A] border-t border-[#2A2A38] relative z-10 items-center justify-center px-6">
        <p className="font-mono text-[10px] text-[#6B7280] uppercase tracking-wider text-center">
          DeskGuard Library Portal System • Verified University Terminal No L41-SEC
        </p>
      </footer>
    </div>
  )
}
