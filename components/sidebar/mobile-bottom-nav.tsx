'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map as MapIcon, Clock, BookOpenCheck, UserSquare2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

const STUDENT_TABS = [
  { href: '/dashboard',             label: 'Map',      icon: MapIcon      },
  { href: '/dashboard/session',     label: 'Session',  icon: Clock        },
  { href: '/dashboard/books',       label: 'Books',    icon: BookOpenCheck },
  { href: '/dashboard/profile',     label: 'Profile',  icon: UserSquare2  },
]

const LIBRARIAN_TABS = [
  { href: '/dashboard/admin',           label: 'Overview', icon: MapIcon       },
  { href: '/dashboard/book-management', label: 'Books',    icon: BookOpenCheck },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isLibrarian = user?.role === 'librarian'
  const tabs = isLibrarian ? LIBRARIAN_TABS : STUDENT_TABS

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#13131A] border-t border-[#2A2A38] z-40 flex items-center justify-around px-2">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
              active ? 'text-[#FF6B1A]' : 'text-[#A0622A]'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-sans font-medium">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
