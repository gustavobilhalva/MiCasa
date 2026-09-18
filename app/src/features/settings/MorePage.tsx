import { Baby, Bell, ChevronRight, Copy, FileText, Home, ListOrdered, NotebookPen, PawPrint, Settings2, Share2, UserPlus, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { createInvite } from '../../lib/household'

export function MorePage() {
  const { user, household, members } = useRequiredHousehold()
  const { signOut } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const invite = async () => {
    setBusy(true)
    try {
      setCode(await createInvite(household.id, user.uid))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const share = async () => {
    if (!code) return
    const text = `Unite a "${household.name}" en Nuestra Casa con el código ${code}: ${location.origin}`
    if (navigator.share) await navigator.share({ text })
    else await copy()
  }

  return (
    <>
      <TopBar title="Más" />
      <main className="flex flex-col gap-6 px-4 py-4">
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="font-semibold">{household.name}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: m.color }} />
                <span>{m.displayName}</span>
                {m.id === user.uid && <span className="text-xs text-muted">(vos)</span>}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            {!code ? (
              <Button variant="secondary" onClick={invite} disabled={busy} className="w-full">
                <UserPlus size={18} /> Invitar a alguien
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">Compartí este código. Vence en 7 días.</p>
                <p className="rounded-xl bg-surface py-3 text-center font-mono text-3xl tracking-[0.3em]">{code}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={copy} className="flex-1">
                    <Copy size={18} /> {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button onClick={share} className="flex-1">
                    <Share2 size={18} /> Compartir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="divide-y divide-line rounded-xl border border-line bg-card">
          <Link to="/menus" className="flex min-h-14 items-center gap-3 px-4">
            <UtensilsCrossed size={20} className="text-accent" />
            <span className="flex-1">Menús y recetas</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/notas" className="flex min-h-14 items-center gap-3 px-4">
            <NotebookPen size={20} className="text-accent" />
            <span className="flex-1">Notas del día</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/familia" className="flex min-h-14 items-center gap-3 px-4">
            <Baby size={20} className="text-accent" />
            <span className="flex-1">Familia (hijo)</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/mascotas" className="flex min-h-14 items-center gap-3 px-4">
            <PawPrint size={20} className="text-accent" />
            <span className="flex-1">Mascotas</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/tramites" className="flex min-h-14 items-center gap-3 px-4">
            <FileText size={20} className="text-accent" />
            <span className="flex-1">Trámites y documentos</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/casa" className="flex min-h-14 items-center gap-3 px-4">
            <Home size={20} className="text-accent" />
            <span className="flex-1">Casa: mantenimiento, garantías, contactos</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </section>

        <section className="divide-y divide-line rounded-xl border border-line bg-card">
          <Link to="/mas/notificaciones" className="flex min-h-14 items-center gap-3 px-4">
            <Bell size={20} className="text-accent" />
            <span className="flex-1">Notificaciones</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/mas/preferencias" className="flex min-h-14 items-center gap-3 px-4">
            <Settings2 size={20} className="text-accent" />
            <span className="flex-1">Preferencias del hogar</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/mas/sectores" className="flex min-h-14 items-center gap-3 px-4">
            <ListOrdered size={20} className="text-accent" />
            <span className="flex-1">Orden de recorrido del súper</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </section>

        <button onClick={signOut} className="text-sm text-muted underline">
          Salir de {user.email}
        </button>
      </main>
    </>
  )
}
