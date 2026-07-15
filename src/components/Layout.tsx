import { NavLink, Outlet } from 'react-router-dom'
import { Plus, Wrench } from 'lucide-react'
import { cn } from '../lib/utils'

const nav = [
  { to: '/', label: 'Systems', icon: Wrench, end: true },
  { to: '/assets/new', label: 'Add', icon: Plus, end: false },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-cream-50 shadow-sm sm:border-x sm:border-cream-200">
      <header className="sticky top-0 z-20 border-b border-cream-200 bg-forest-900 text-cream-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-cream-300 uppercase">
              Beausoleil Farm
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Maintenance
            </h1>
          </div>
          <div className="rounded-full bg-forest-800 px-3 py-1 text-xs text-cream-200">
            Systems
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="safe-pb fixed right-0 bottom-0 left-0 z-20 border-t border-cream-200 bg-cream-50/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl justify-around px-2 pt-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
