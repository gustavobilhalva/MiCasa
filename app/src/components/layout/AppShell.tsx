import { Calendar, Home, MoreHorizontal, ShoppingCart, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { listenForegroundMessages } from '../../lib/messaging'

const NAV = [
  { to: '/', label: 'Hoy', icon: Home, end: true },
  { to: '/super', label: 'Súper', icon: ShoppingCart },
  { to: '/gastos', label: 'Gastos', icon: Wallet },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/mas', label: 'Más', icon: MoreHorizontal },
]

export function AppShell() {
  const navigate = useNavigate()
  const [toast, setToast] = useState<{ title: string; body: string; url: string } | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    listenForegroundMessages((title, body, url) => {
      setToast({ title, body, url })
      setTimeout(() => setToast(null), 6000)
    }).then((u) => (unsub = u))
    return () => unsub?.()
  }, [])

  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav
        aria-label="Principal"
        className="order-last flex shrink-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:order-first md:w-56 md:flex-col md:border-r md:border-t-0 md:pt-6"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs md:flex-none md:flex-row md:justify-start md:gap-3 md:px-6 md:text-base ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl">
          <Outlet />
        </div>
      </div>
      {toast && (
        <button
          onClick={() => {
            navigate(toast.url)
            setToast(null)
          }}
          className="fixed inset-x-4 top-4 z-50 rounded-xl border border-line bg-card p-3 text-left shadow-lg md:left-auto md:w-96"
        >
          <p className="font-medium">{toast.title}</p>
          <p className="text-sm text-muted">{toast.body}</p>
        </button>
      )}
    </div>
  )
}
