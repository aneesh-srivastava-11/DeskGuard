'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  GraduationCap, Map as MapIcon, Clock, BookOpenCheck,
  UserSquare2, Lock, LogOut, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const isLibrarian = user?.role === 'librarian'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Student nav items
  const studentNav = [
    { href: '/dashboard',              label: 'Live Map',  icon: MapIcon       },
    { href: '/dashboard/session',      label: 'My Session',icon: Clock         },
    { href: '/dashboard/books',        label: 'Books',     icon: BookOpenCheck },
    { href: '/dashboard/profile',      label: 'Profile',   icon: UserSquare2   },
  ]

  // Librarian nav items
  const librarianNav = [
    { href: '/dashboard/admin',           label: 'Desk Overview',   icon: MapIcon       },
    { href: '/dashboard/book-management', label: 'Book Management', icon: BookOpenCheck },
    { href: '/dashboard/admin/reports',   label: 'Reports',         icon: UserSquare2   },
    { href: '/dashboard/admin/settings',  label: 'Settings',        icon: Lock          },
  ]

  const navItems = isLibrarian ? librarianNav : studentNav

  const isActive = (href: string) => {
    if (href === '/dashboard/admin') {
      return pathname === '/dashboard/admin'
    }
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AS'

  return (
    <aside
      id={isLibrarian ? 'sidebar-navigation-librarian' : 'sidebar-navigation'}
      className="hidden md:flex flex-col justify-between shrink-0 bg-[var(--surface)] border-r border-[var(--border-custom)] lg:w-[240px] md:w-[64px] transition-all duration-300"
    >
      <div className="p-3 pt-4 lg:pt-[16px] lg:px-6 lg:pb-6 space-y-6">
        {/* Wordmark */}
        <div className="space-y-2 flex flex-col items-center lg:items-start">
          <div className="flex items-center lg:space-x-3">
            <div className="p-1.5 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[10px] text-[#FF6B1A]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-[18px] text-[var(--text-primary)] leading-none tracking-tight hidden lg:block">
              DeskGuard
            </h1>
          </div>
          {isLibrarian && (
            <div className="hidden lg:inline-block bg-[#FF6B1A] text-white px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider">
              LIBRARIAN
            </div>
          )}
        </div>
 
        {/* Nav */}
        <nav className="space-y-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`w-full h-10 rounded-[12px] flex items-center justify-center lg:justify-start lg:px-4 lg:space-x-3 transition-all text-left ${
                  active
                    ? 'text-[var(--sidebar-active-text)] bg-[var(--sidebar-active-bg)] border-l-2 border-l-[var(--sidebar-active-border)] font-semibold shadow-sm'
                    : 'text-[var(--sidebar-inactive-text)] hover:text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-hover-bg)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-inactive-text)]'}`} />
                <span className="text-sm font-semibold font-sans hidden lg:block">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
 
      {/* Bottom: avatar + theme toggle + logout */}
      <div className="p-3 lg:p-4 border-t border-[var(--border-custom)] bg-[var(--surface)] space-y-4">
        <div id={isLibrarian ? 'librarian-avatar-badge' : 'student-avatar-badge'}
          className="flex items-center justify-center lg:justify-start lg:space-x-3 py-3">
          <div className="w-10 h-10 rounded-full bg-[var(--elevated)] border border-[var(--border-custom)] flex items-center justify-center font-display font-medium text-[#FF6B1A] tracking-tight shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1 hidden lg:block">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate font-sans">{user?.name ?? 'Student'}</p>
            <p className="font-mono text-[11px] text-[var(--text-muted)] tracking-wider truncate">
              {user?.regNo ?? user?.email ?? '—'}
            </p>
          </div>
        </div>
 
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full h-9 rounded-[10px] bg-[var(--elevated)] hover:bg-[var(--surface)] text-[11px] text-[var(--text-secondary)] font-sans font-medium flex items-center justify-center gap-2 border border-[var(--border-custom)] cursor-pointer transition-all active:scale-95"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Moon className="w-3.5 h-3.5 text-[#4F8EF7]" />}
          <span className="hidden lg:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
 
        {/* Logout */}
        <button
          id={isLibrarian ? 'btn-switch-portal-librarian' : 'btn-logout-to-s1'}
          onClick={handleSignOut}
          className="w-full h-9 rounded-[10px] bg-[var(--elevated)] hover:bg-[var(--surface)] text-[11px] text-[var(--text-secondary)] font-sans font-medium flex items-center justify-center gap-2 border border-[var(--border-custom)] cursor-pointer transition-all active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
