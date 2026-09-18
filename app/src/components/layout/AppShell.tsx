import { Baby, Calendar, FileText, Home, House, NotebookPen, PawPrint, Settings, ShoppingCart, UtensilsCrossed, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { listenForegroundMessages } from '../../lib/messaging'

const NAV = [
  { to: '/', label: 'Hoy', icon: Home, end: true },
  { to: '/super', label: 'Súper', icon: ShoppingCart },
  { to: '/gastos', label: 'Gastos', icon: Wallet },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/notas', label: 'Notas', icon: NotebookPen },
  { to: '/menus', label: 'Menús', icon: UtensilsCrossed },
  { to: '/familia', label: 'Familia', icon: Baby },
  { to: '/mascotas', label: 'Mascotas', icon: PawPrint },
  { to: '/tramites', label: 'Trámites', icon: FileText },
  { to: '/casa', label: 'Casa', icon: House },
  { to: '/mas', label: 'Ajustes', icon: Settings },
]

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [toast, setToast] = useState<{ title: string; body: string; url: string } | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    listenForegroundMessages((title, body, url) => {
      setToast({ title, body, url })
      setTimeout(() => setToast(null), 6000)
    }).then((u) => (unsub = u))
    return () => unsub?.()
  }, [])

  // En móvil la barra se desliza: mantener visible la sección activa.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [location.pathname])

  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav
        ref={navRef}
        aria-label="Principal"
        className="order-last flex shrink-0 overflow-x-auto border-t border-line bg-card pb-[env(safe-area-inset-bottom)] [scrollbar-width:none] md:order-first md:w-56 md:flex-col md:overflow-y-auto md:border-r md:border-t-0 md:pt-6 [&::-webkit-scrollbar]:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-14 min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-6 md:text-base ${
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
