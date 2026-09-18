import { ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// Súper y Menús viven juntos en la sección "Comidas"; este selector va en la barra superior de ambas pantallas.
export function FoodSwitch() {
  const opts = [
    { to: '/super', label: 'Súper', icon: ShoppingCart },
    { to: '/menus', label: 'Menús', icon: UtensilsCrossed },
  ]
  return (
    <nav aria-label="Comidas" className="flex rounded-full border border-line bg-card p-0.5">
      {opts.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${isActive ? 'bg-accent text-white' : 'text-muted'}`}
        >
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </nav>
  )
}
