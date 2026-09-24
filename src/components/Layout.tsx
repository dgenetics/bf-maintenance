import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { CalendarClock, CalendarRange, LogOut, MoreHorizontal, Plus, Wrench } from 'lucide-react'
import { cn } from '../lib/utils'

const nav = [
  { to: '/', label: 'Systems', icon: Wrench, end: true },
  { to: '/maintenance', label: 'Chores', icon: CalendarClock, end: false },
  { to: '/schedules', label: 'Schedules', icon: CalendarRange, end: false },
]

function isNavActive(pathname: string, to: string, end: boolean) {
  if (end) return pathname === to || (to === '/' && pathname === '')
  return pathname === to || pathname.startsWith(`${to}/`)
}

const addCtaClass =
  'inline-flex items-center gap-1.5 rounded-xl bg-cream-100 px-4 py-2.5 text-sm font-semibold text-forest-900 shadow-sm transition hover:bg-cream-50 active:scale-[0.98]'

function HeaderPill() {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()

  function openAdd() {
    const next = new URLSearchParams(params)
    next.set('add', '1')
    setParams(next, { replace: true })
  }

  if (pathname === '/' || pathname === '') {
    return (
      <button type="button" className={addCtaClass} onClick={openAdd}>
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Add system
      </button>
    )
  }

  if (pathname.startsWith('/schedules')) {
    return (
      <button type="button" className={addCtaClass} onClick={openAdd}>
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Add schedule
      </button>
    )
  }

  const label = pathname.startsWith('/maintenance') ? 'Chores' : 'Systems'
  return (
    <div className="rounded-full bg-forest-800 px-3 py-1 text-xs text-cream-200">
      {label}
    </div>
  )
}

function HeaderOverflowMenu({ onSignOut }: { onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="rounded-lg p-1.5 text-cream-300 transition hover:bg-forest-800 hover:text-cream-50"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="More"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-cream-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted hover:bg-cream-100 hover:text-ink"
            onClick={() => {
              setMenuOpen(false)
              onSignOut()
            }}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Layout({ onSignedOut }: { onSignedOut: () => void }) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  function scrollMainToTop() {
    const main = mainRef.current
    if (main) {
      main.scrollTop = 0
      main.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  async function signOut() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      // Match AuthGate: flip app authState to locked so the Sign in gate
      // appears immediately (window.location.assign('/') no-ops when already on /).
      onSignedOut()
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-3xl flex-col overflow-x-hidden overflow-y-hidden bg-cream-50 shadow-sm sm:border-x sm:border-cream-200">
      <header className="shrink-0 z-20 border-b border-cream-200 bg-forest-900 text-cream-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-cream-300 uppercase">
              Beausoleil Farm
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Maintenance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <HeaderPill />
            <HeaderOverflowMenu onSignOut={() => void signOut()} />
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-[calc(3.75rem+1.5rem+max(0.75rem,env(safe-area-inset-bottom,0px)))]"
      >
        <Outlet />
      </main>

      <nav className="safe-pb fixed right-0 bottom-0 left-0 z-20 border-t border-cream-200 bg-cream-50/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl justify-around px-2 pt-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={(event) => {
                if (!isNavActive(pathname, to, end)) return
                event.preventDefault()
                scrollMainToTop()
              }}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'bg-forest-100 text-forest-900'
                    : 'text-muted hover:text-forest-800',
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
